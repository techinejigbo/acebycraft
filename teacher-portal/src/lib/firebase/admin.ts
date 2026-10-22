import type { App, ServiceAccount } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';

function loadFirebaseApp(): typeof import('firebase-admin/app') {
  try {
    const nativeRequire = eval('require') as NodeRequire;
    return nativeRequire('firebase-admin/app');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('firebase-admin/app');
  }
}

function loadFirebaseFirestore(): typeof import('firebase-admin/firestore') {
  try {
    const nativeRequire = eval('require') as NodeRequire;
    return nativeRequire('firebase-admin/firestore');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('firebase-admin/firestore');
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
  const { getApps, initializeApp, cert } = loadFirebaseApp();
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
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  return loadFirebaseFirestore().getFirestore(adminApp);
}
