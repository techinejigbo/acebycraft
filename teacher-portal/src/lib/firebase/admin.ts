import { getApps, initializeApp, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

export const isFirebaseAdminConfigured = (): boolean => {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    (process.env.FIREBASE_ADMIN_PROJECT_ID && 
     process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
     process.env.FIREBASE_ADMIN_PRIVATE_KEY)
  );
};

export function getAdminApp(): App | null {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  if (!isFirebaseAdminConfigured()) {
    console.warn('[Firebase Teacher Admin] Service Account credentials not provided.');
    return null;
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      
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
    console.error('[Firebase Teacher Admin] Error initializing Admin SDK:', error);
    return null;
  }
}

export function getAdminFirestore(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  return getFirestore(app);
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  if (!app) return null;
  return getAuth(app);
}
