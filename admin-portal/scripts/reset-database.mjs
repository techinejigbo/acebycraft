import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let envPath = resolve('.env');
if (!existsSync(envPath)) {
  envPath = resolve('../admin-portal/.env');
}
const envContent = readFileSync(envPath, 'utf-8');

let serviceAccountKey = null;
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='(.*?)'/s);
if (match && match[1]) {
  try {
    serviceAccountKey = JSON.parse(match[1]);
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from .env:', e);
  }
}

if (!serviceAccountKey) {
  console.error('No serviceAccountKey found in .env');
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccountKey) });
const db = getFirestore(app);

async function cleanCollection(colName) {
  const snap = await db.collection(colName).get();
  console.log(`[Reset] Found ${snap.size} documents in "${colName}". Deleting...`);
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`[Reset] Successfully wiped "${colName}".`);
}

async function run() {
  console.log('--- PURGING TEST AND DEMO DATA FROM FIRESTORE DATABASE ---');
  await cleanCollection('submissions');
  await cleanCollection('airtimeTransactions');
  await cleanCollection('users');
  console.log('--- FIRESTORE IS NOW 100% CLEAN & READY FOR FRESH PRODUCTION USE ---');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
