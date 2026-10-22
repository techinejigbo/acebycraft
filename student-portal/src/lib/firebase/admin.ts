import type { App, ServiceAccount } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

function loadFirebaseAdmin() {
  try {
    const nativeRequire = eval('require') as NodeRequire;
    return {
      app: nativeRequire('firebase-admin/app') as typeof import('firebase-admin/app'),
      firestore: nativeRequire('firebase-admin/firestore') as typeof import('firebase-admin/firestore'),
      auth: nativeRequire('firebase-admin/auth') as typeof import('firebase-admin/auth'),
    };
  } catch {
    return {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      app: require('firebase-admin/app') as typeof import('firebase-admin/app'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      firestore: require('firebase-admin/firestore') as typeof import('firebase-admin/firestore'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      auth: require('firebase-admin/auth') as typeof import('firebase-admin/auth'),
    };
  }
}

export const isFirebaseAdminConfigured = (): boolean => {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    (process.env.FIREBASE_ADMIN_PROJECT_ID && 
     process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
     process.env.FIREBASE_ADMIN_PRIVATE_KEY)
  );
};

export function getAdminApp(): App | null {
  const { app } = loadFirebaseAdmin();
  const { getApps, initializeApp, cert } = app;
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  if (!isFirebaseAdminConfigured()) {
    console.warn('[Firebase Admin] Service Account credentials not provided. Operating in Demo/Mock backend mode.');
    return null;
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      
      // Strip outer quotes if enclosed
      if ((rawKey.startsWith("'") && rawKey.endsWith("'")) || (rawKey.startsWith('"') && rawKey.endsWith('"'))) {
        rawKey = rawKey.slice(1, -1).trim();
      }

      let parsedCredentials: ServiceAccount;
      if (rawKey.startsWith('{')) {
        parsedCredentials = JSON.parse(rawKey);
      } else {
        const decoded = Buffer.from(rawKey, 'base64').toString('utf-8');
        parsedCredentials = JSON.parse(decoded);
      }

      return initializeApp({
        credential: cert(parsedCredentials),
      });
    }

    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (process.env.FIREBASE_ADMIN_PROJECT_ID && privateKey) {
      return initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }
    return null;
  } catch (error) {
    console.error('[Firebase Admin] Error initializing Admin SDK:', error);
    return null;
  }
}

export function getAdminFirestore(): Firestore | null {
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const { firestore } = loadFirebaseAdmin();
  return firestore.getFirestore(adminApp);
}

export function getAdminAuth(): Auth | null {
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const { auth } = loadFirebaseAdmin();
  return auth.getAuth(adminApp);
}
