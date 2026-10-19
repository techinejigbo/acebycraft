import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function seed() {
  console.log('[Seed] Connecting to Firestore via Admin SDK...');
  const keyPath = resolve('serviceAccountKey.json');
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));

  const app = initializeApp({
    credential: cert(serviceAccount)
  });
  const db = getFirestore(app);

  const samplePath = resolve('src/data/sample_biology_assessments.json');
  const sampleData = JSON.parse(readFileSync(samplePath, 'utf-8'));
  const firstAssessment = sampleData[0];

  const assessmentMeta = {
    id: firstAssessment.id,
    title: firstAssessment.title,
    description: firstAssessment.description,
    subject: firstAssessment.subject,
    classLevel: firstAssessment.classLevel,
    durationMinutes: firstAssessment.durationMinutes,
    isActive: true,
    isWeekendOnly: true,
    totalMarks: firstAssessment.totalMarks,
    rewardConfig: firstAssessment.rewardConfig,
    questionCount: firstAssessment.questions.length,
    updatedAt: new Date().toISOString(),
  };

  console.log(`[Seed] Writing assessment document: assessments/${firstAssessment.id}`);
  await db.collection('assessments').doc(firstAssessment.id).set(assessmentMeta);

  // Write client questions (without answers/explanations)
  const batch = db.batch();
  for (const q of firstAssessment.questions) {
    const qRef = db.collection('assessments').doc(firstAssessment.id).collection('questions').doc(q.id);
    batch.set(qRef, {
      id: q.id,
      question: q.question,
      topic: q.topic,
      options: q.options,
    });
  }
  await batch.commit();
  console.log(`[Seed] Successfully wrote ${firstAssessment.questions.length} client questions (answer keys stripped).`);

  // Write answer key to STRICT PROTECTED collection: answerKeys/{assessmentId}
  const keys = {};
  const explanations = {};
  for (const q of firstAssessment.questions) {
    keys[q.id] = q.correctOption;
    explanations[q.id] = q.explanation;
  }

  console.log(`[Seed] Writing locked answer key: answerKeys/${firstAssessment.id}`);
  await db.collection('answerKeys').doc(firstAssessment.id).set({
    id: firstAssessment.id,
    title: firstAssessment.title,
    keys,
    explanations,
    rewardConfig: firstAssessment.rewardConfig,
    totalMarks: firstAssessment.totalMarks,
    updatedAt: new Date().toISOString(),
  });

  // Seed sample student row for initial instructor dashboard visibility
  console.log('[Seed] Seeding sample student in users collection...');
  await db.collection('users').doc('demo-student-001').set({
    uid: 'demo-student-001',
    phone: '+2348123456789',
    displayName: 'Adeola Johnson',
    studentId: 'BIO/2026/042',
    schoolClass: 'SS 3 Science A',
    network: 'MTN',
    totalCaScore: 13.0,
    completedAssessmentsCount: 1,
    totalAirtimeWonNgn: 200,
    lastActive: new Date().toISOString(),
  }, { merge: true });

  console.log('✅ Firestore live database seeded with biology assessment, questions & locked answer keys!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
