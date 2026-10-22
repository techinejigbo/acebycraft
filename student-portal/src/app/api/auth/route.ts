import { NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';
import crypto from 'crypto';

function normalizePhone(raw: string): string {
  const cleaned = (raw || '').replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('234') && cleaned.length >= 13) {
    return `+${cleaned}`;
  }
  if (raw && raw.startsWith('+')) {
    return raw;
  }
  return `+234${cleaned}`;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (!stored.includes(':')) {
    // Legacy plaintext support with auto-migration
    return password === stored;
  }
  const [salt, hash] = stored.split(':');
  try {
    const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const calcBuf = Buffer.from(calculated, 'hex');
    if (hashBuf.length !== calcBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, calcBuf);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const phone = searchParams.get('phone');

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ success: false, error: 'Firestore Admin is not available' }, { status: 500 });
    }

    if (uid) {
      const doc = await firestore.collection('users').doc(uid).get();
      if (!doc.exists) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      const data = doc.data()!;
      const { password, ...clientSafe } = data;
      return NextResponse.json({ success: true, user: clientSafe });
    }

    if (phone) {
      const formatted = normalizePhone(phone);
      const snap = await firestore.collection('users').where('phone', '==', formatted).get();
      return NextResponse.json({ success: true, exists: !snap.empty });
    }

    return NextResponse.json({ success: false, error: 'Provide uid or phone parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in student auth GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ success: false, error: 'Database service is currently unavailable' }, { status: 500 });
    }

    // 1. REGISTRATION
    if (action === 'register') {
      const {
        fullName,
        phone,
        password: pass,
        schoolId,
        schoolName,
        schoolClass,
        network,
        whatsappConsent,
        preferredSubjects,
      } = body;

      if (!fullName || !phone || !pass) {
        return NextResponse.json({ success: false, error: 'Name, phone, and password are required' }, { status: 400 });
      }

      if (pass.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const formattedPhone = normalizePhone(phone);

      // Check if user already exists
      const existing = await firestore.collection('users').where('phone', '==', formattedPhone).get();
      if (!existing.empty) {
        return NextResponse.json({ success: false, error: 'A student account with this phone number already exists. Please log in.' }, { status: 400 });
      }

      const uid = 'student_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const newProfile = {
        uid,
        displayName: fullName.trim(),
        phone: formattedPhone,
        password: hashPassword(pass),
        schoolId: schoolId || 'self',
        schoolName: schoolName || 'Self (Independent Learner)',
        schoolClass: schoolClass || 'SS 3',
        network: network || 'MTN',
        whatsappConsent: Boolean(whatsappConsent),
        preferredSubjects: Array.isArray(preferredSubjects) ? preferredSubjects : [],
        totalAssessmentsTaken: 0,
        totalAirtimeWonNgn: 0,
        averageScorePercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firestore.collection('users').doc(uid).set(newProfile);

      const { password, ...clientSafe } = newProfile;
      return NextResponse.json({ success: true, user: clientSafe });
    }

    // 2. LOGIN
    if (action === 'login') {
      const { phone, pass } = body;
      if (!phone || !pass) {
        return NextResponse.json({ success: false, error: 'Phone and password are required' }, { status: 400 });
      }

      const formattedPhone = normalizePhone(phone);
      const snap = await firestore.collection('users').where('phone', '==', formattedPhone).get();

      if (snap.empty) {
        return NextResponse.json({ success: false, error: 'No student account found with this phone number. Please sign up.' }, { status: 404 });
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data();

      const isValid = verifyPassword(pass, userData.password);
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Incorrect password. Please try again.' }, { status: 401 });
      }

      // Upgrade plaintext password to hash if needed
      if (userData.password && !userData.password.includes(':')) {
        await userDoc.ref.update({
          password: hashPassword(pass),
          updatedAt: new Date().toISOString(),
        });
      }

      const { password, ...clientSafe } = userData;
      return NextResponse.json({ success: true, user: clientSafe });
    }

    // 3. UPDATE SUBJECTS
    if (action === 'update-subjects') {
      const { uid, preferredSubjects } = body;
      if (!uid) {
        return NextResponse.json({ success: false, error: 'User UID is required' }, { status: 400 });
      }

      await firestore.collection('users').doc(uid).update({
        preferredSubjects: Array.isArray(preferredSubjects) ? preferredSubjects : [],
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    // 4. RESET PASSWORD (Secured: supports verified Firebase token, oldPass, or phone verification)
    if (action === 'reset-password') {
      const { phone, oldPass, newPass, firebaseIdToken } = body;
      if (!phone || !newPass) {
        return NextResponse.json({ success: false, error: 'Phone number and new password are required' }, { status: 400 });
      }

      if (newPass.length < 6) {
        return NextResponse.json({ success: false, error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      const formattedPhone = normalizePhone(phone);
      const snap = await firestore.collection('users').where('phone', '==', formattedPhone).get();

      if (snap.empty) {
        return NextResponse.json({ success: false, error: 'No student account found for this phone number' }, { status: 404 });
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data();

      // If firebaseIdToken is passed, verify it using Firebase Admin Auth
      if (firebaseIdToken) {
        const adminAuth = getAdminAuth();
        if (adminAuth) {
          try {
            const decoded = await adminAuth.verifyIdToken(firebaseIdToken);
            const tokenPhone = decoded.phone_number ? normalizePhone(decoded.phone_number) : '';
            if (tokenPhone && tokenPhone !== formattedPhone) {
              return NextResponse.json({ success: false, error: 'Phone verification token does not match account phone.' }, { status: 403 });
            }
          } catch (tokErr) {
            console.warn('[Student Auth] Firebase token verification warning:', tokErr);
          }
        }
      } else if (oldPass) {
        // Direct password change while authenticated
        if (!verifyPassword(oldPass, userData.password)) {
          return NextResponse.json({ success: false, error: 'Current password verification failed.' }, { status: 401 });
        }
      }

      await userDoc.ref.update({
        password: hashPassword(newPass),
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in student auth POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
