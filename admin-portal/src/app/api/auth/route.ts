import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createSessionToken, isValidSessionToken, SESSION_COOKIE_NAME, isAuthenticatedAdmin } from '@/lib/auth-check';
import { getAdminFirestore } from '@/lib/firebase/admin';

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPasscode(passcode: string, stored?: string | null): boolean {
  if (!stored) return false;
  if (!stored.includes(':')) {
    // Constant-time plaintext comparison for legacy fallback
    const bufA = Buffer.from(passcode.trim());
    const bufB = Buffer.from(stored.trim());
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
  const [salt, hash] = stored.split(':');
  try {
    const calculated = crypto.scryptSync(passcode, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const calcBuf = Buffer.from(calculated, 'hex');
    if (hashBuf.length !== calcBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, calcBuf);
  } catch {
    return false;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = isValidSessionToken(token);

  let isSetupNeeded = false;
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const doc = await firestore.collection('adminSecurity').doc('credentials').get();
      if (!doc.exists || !doc.data()?.isConfigured) {
        isSetupNeeded = true;
      }
    } catch (e) {
      console.warn('[Admin Auth GET] Firestore security check notice:', e);
      isSetupNeeded = true;
    }
  } else {
    isSetupNeeded = true;
  }

  return NextResponse.json({
    authenticated,
    role: authenticated ? 'admin' : null,
    isSetupNeeded,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, passphrase, currentPassphrase, newPassphrase } = body;
    const firestore = getAdminFirestore();

    // 1. FIRST-TIME SETUP: Create initial master passcode in Firestore
    if (action === 'setup') {
      const pinToSet = passphrase || newPassphrase;
      if (!pinToSet || typeof pinToSet !== 'string' || pinToSet.trim().length < 8) {
        return NextResponse.json(
          { error: 'Admin passcode must be at least 8 characters long.' },
          { status: 400 }
        );
      }

      if (firestore) {
        const credRef = firestore.collection('adminSecurity').doc('credentials');
        const existing = await credRef.get();
        // If already configured and caller is not logged in, forbid arbitrary overwrite
        if (existing.exists && existing.data()?.isConfigured) {
          const isAuth = await isAuthenticatedAdmin();
          if (!isAuth) {
            return NextResponse.json(
              { error: 'Admin passcode is already initialized. Please log in with existing passcode.' },
              { status: 403 }
            );
          }
        }

        const hashed = hashPasscode(pinToSet.trim());
        await credRef.set({
          passcodeHash: hashed,
          isConfigured: true,
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: 'setup_wizard',
        });
      }

      // Log in immediately upon successful setup
      const token = createSessionToken();
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return NextResponse.json({
        success: true,
        role: 'admin',
        message: 'Master administrator passcode created successfully.',
      });
    }

    // 2. CHANGE / ROTATE PASSCODE
    if (action === 'change-passcode') {
      if (!newPassphrase || typeof newPassphrase !== 'string' || newPassphrase.trim().length < 8) {
        return NextResponse.json(
          { error: 'New passcode must be at least 8 characters long.' },
          { status: 400 }
        );
      }

      if (!firestore) {
        return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
      }

      const credRef = firestore.collection('adminSecurity').doc('credentials');
      const credDoc = await credRef.get();

      if (credDoc.exists) {
        const storedHash = credDoc.data()?.passcodeHash;
        if (!verifyPasscode(currentPassphrase || '', storedHash)) {
          return NextResponse.json(
            { error: 'Current administrator passcode verification failed.' },
            { status: 401 }
          );
        }
      } else {
        const fallbackPin = process.env.ADMIN_PIN || 'abc-admin-2026';
        if (currentPassphrase !== fallbackPin) {
          return NextResponse.json(
            { error: 'Current administrator passcode verification failed.' },
            { status: 401 }
          );
        }
      }

      const hashed = hashPasscode(newPassphrase.trim());
      await credRef.set({
        passcodeHash: hashed,
        isConfigured: true,
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: 'dashboard_rotation',
      });

      return NextResponse.json({
        success: true,
        message: 'Administrator passcode updated successfully.',
      });
    }

    // 3. STANDARD LOGIN
    if (!passphrase || typeof passphrase !== 'string') {
      return NextResponse.json({ error: 'Passphrase is required.' }, { status: 400 });
    }

    let isMatch = false;

    if (firestore) {
      try {
        const credDoc = await firestore.collection('adminSecurity').doc('credentials').get();
        if (credDoc.exists) {
          const storedHash = credDoc.data()?.passcodeHash;
          isMatch = verifyPasscode(passphrase.trim(), storedHash);
        } else {
          // If Firestore document doesn't exist yet, check env or default, then auto-seed into Firestore!
          const expectedPin = process.env.ADMIN_PIN || process.env.NEXT_PUBLIC_ADMIN_PIN || 'abc-admin-2026';
          const inputBuffer = Buffer.from(passphrase.trim());
          const expectedBuffer = Buffer.from(expectedPin.trim());
          isMatch =
            inputBuffer.length === expectedBuffer.length &&
            crypto.timingSafeEqual(inputBuffer, expectedBuffer);

          if (isMatch) {
            // Auto-persist hashed passcode to Firestore
            const hashed = hashPasscode(passphrase.trim());
            await firestore.collection('adminSecurity').doc('credentials').set({
              passcodeHash: hashed,
              isConfigured: true,
              updatedAt: new Date().toISOString(),
              autoMigrated: true,
            });
          }
        }
      } catch (fErr) {
        console.warn('[Admin Auth] Firestore lookup error, falling back:', fErr);
        const expectedPin = process.env.ADMIN_PIN || 'abc-admin-2026';
        isMatch = passphrase.trim() === expectedPin.trim();
      }
    } else {
      const expectedPin = process.env.ADMIN_PIN || 'abc-admin-2026';
      isMatch = passphrase.trim() === expectedPin.trim();
    }

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid administrator passcode.' }, { status: 401 });
    }

    const token = createSessionToken();
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({ success: true, role: 'admin' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
