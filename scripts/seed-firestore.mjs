import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyDEo3q4r_89R-YVyXcF3-E_pQsg_9hSKZY",
  authDomain: "bio-air.firebaseapp.com",
  projectId: "bio-air",
  storageBucket: "bio-air.firebasestorage.app",
  messagingSenderId: "664886482787",
  appId: "1:664886482787:web:11f531c51d2ef546aee556",
  measurementId: "G-KZ2GQHTP4V"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('[Seed] Connecting to Firestore project: bio-air...');
  
  const samplePath = resolve(process.cwd(), 'sample_biology_assessments.json');
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
  await setDoc(doc(db, 'assessments', firstAssessment.id), assessmentMeta);

  // Write client questions (without answers)
  for (const q of firstAssessment.questions) {
    console.log(`[Seed] Writing question: ${q.id}`);
    await setDoc(doc(db, 'assessments', firstAssessment.id, 'questions', q.id), {
      id: q.id,
      question: q.question,
      topic: q.topic,
      options: q.options,
    });
  }

  // Write answer key to answerKeys collection
  const keys = {};
  const explanations = {};
  for (const q of firstAssessment.questions) {
    keys[q.id] = q.correctOption;
    explanations[q.id] = q.explanation;
  }

  console.log(`[Seed] Writing locked answer key: answerKeys/${firstAssessment.id}`);
  await setDoc(doc(db, 'answerKeys', firstAssessment.id), {
    id: firstAssessment.id,
    title: firstAssessment.title,
    keys,
    explanations,
    rewardConfig: firstAssessment.rewardConfig,
    totalMarks: firstAssessment.totalMarks,
    updatedAt: new Date().toISOString(),
  });

  console.log('✅ Seeding completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
