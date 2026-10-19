import { getApps, initializeApp, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { AssessmentForm, StudentRow, SubmissionRow, AirtimeTxRow, AdminMetrics } from '@/types';

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
    console.warn('[Admin Portal] Service Account not provided. Running in Demo/Mock storage mode.');
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
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } catch (error) {
    console.error('[Admin Portal] Error initializing Admin SDK:', error);
    return null;
  }
}

export function getAdminFirestore(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  return getFirestore(app);
}

// In-memory fallback stores (initialized completely empty for fresh production use)
let mockAssessmentsStore: AssessmentForm[] = [];
let mockStudentsStore: StudentRow[] = [];
let mockSubmissionsStore: SubmissionRow[] = [];
let mockAirtimeStore: AirtimeTxRow[] = [];

/**
 * Saves an assessment while strictly isolating the answer key in the protected collection
 */
export async function saveAssessmentWithLockedKey(data: AssessmentForm) {
  const assessmentId = data.id || `bio-ca-${Date.now()}`;
  const firestore = getAdminFirestore();

  const assessmentMeta = {
    title: data.title,
    description: data.description,
    subject: data.subject || 'Biology',
    classLevel: data.classLevel || 'Senior Secondary',
    durationMinutes: Number(data.durationMinutes) || 15,
    isActive: Boolean(data.isActive),
    isWeekendOnly: Boolean(data.isWeekendOnly),
    startTime: data.startTime,
    endTime: data.endTime,
    rewardConfig: data.rewardConfig,
    totalMarks: (data.questions || []).length,
    questionCount: (data.questions || []).length,
    updatedAt: new Date().toISOString(),
  };

  // Build Answer Key map & explanations
  const keys: Record<string, string> = {};
  const explanations: Record<string, string> = {};
  const questionsList = data.questions || [];

  questionsList.forEach((q, idx) => {
    const qId = q.id || `q${idx + 1}`;
    keys[qId] = q.correctOption;
    explanations[qId] = q.explanation || '';
  });

  const answerKeyDocument = {
    title: data.title,
    keys,
    explanations,
    rewardConfig: data.rewardConfig,
    totalMarks: questionsList.length,
    updatedAt: new Date().toISOString(),
  };

  if (firestore) {
    const batch = firestore.batch();

    // 1. Write public assessment metadata
    const assessRef = firestore.collection('assessments').doc(assessmentId);
    batch.set(assessRef, assessmentMeta);

    // 2. Write client-safe questions (NO correctOption, NO explanation)
    for (let i = 0; i < questionsList.length; i++) {
      const q = questionsList[i];
      const qId = q.id || `q${i + 1}`;
      const qRef = assessRef.collection('questions').doc(qId);
      batch.set(qRef, {
        question: q.question || q.questionText || '',
        topic: q.topic || 'General Topic',
        options: q.options,
      });
    }

    // 3. Write answer key to STRICT PROTECTED collection: /answerKeys/{assessmentId}
    const keyRef = firestore.collection('answerKeys').doc(assessmentId);
    batch.set(keyRef, answerKeyDocument);

    await batch.commit();
  } else {
    // In-memory mock store
    const fullFormWithId = { ...data, id: assessmentId };
    mockAssessmentsStore = [
      fullFormWithId,
      ...mockAssessmentsStore.filter((a) => a.id !== assessmentId),
    ];
  }

  return { id: assessmentId, success: true };
}

export async function fetchAllAssessments(): Promise<AssessmentForm[]> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection('assessments').get();
      return snap.docs.map((d: any) => ({
        id: d.id,
        ...(d.data() as Omit<AssessmentForm, 'id' | 'questions'>),
        questions: [],
      }));
    } catch (e) {
      console.warn('Firestore fetch assessments warning:', e);
    }
  }
  return mockAssessmentsStore;
}

export async function toggleAssessmentStatus(assessmentId: string, isActive: boolean): Promise<boolean> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      await firestore.collection('assessments').doc(assessmentId).update({
        isActive,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error('Firestore toggle assessment status error:', e);
      throw e;
    }
  }

  const target = mockAssessmentsStore.find((a) => a.id === assessmentId);
  if (target) {
    target.isActive = isActive;
    return true;
  }
  return false;
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const usersSnap = await firestore.collection('users').get();
      const assessSnap = await firestore.collection('assessments').where('isActive', '==', true).get();
      const subsSnap = await firestore.collection('submissions').get();

      let airtimeTotal = 0;
      let totalScore = 0;

      subsSnap.docs.forEach((d: any) => {
        const sub = d.data();
        if (sub.airtimeAwarded) {
          airtimeTotal += (sub.airtimeAmountNgn || 0);
        }
        totalScore += (sub.scorePercent || 0);
      });

      return {
        totalStudents: usersSnap.size,
        activeAssessments: assessSnap.size,
        totalAirtimeDisbursedNgn: airtimeTotal,
        totalSubmissions: subsSnap.size,
        avgCaScore: subsSnap.size > 0 ? Math.round(totalScore / subsSnap.size) : 0,
      };
    } catch (e) {
      console.warn('Firestore metrics query warning:', e);
    }
  }

  // Fallback metrics when no records exist
  const totalAirtime = mockSubmissionsStore.reduce(
    (acc, s) => acc + (s.airtimeAwarded ? s.airtimeAmountNgn : 0),
    0
  );
  const avg = mockSubmissionsStore.length > 0
    ? Math.round(mockSubmissionsStore.reduce((acc, s) => acc + (s.scorePercent || s.averagePercentage || 0), 0) / mockSubmissionsStore.length)
    : 0;

  return {
    totalStudents: mockStudentsStore.length,
    activeAssessments: mockAssessmentsStore.filter((a) => a.isActive).length,
    totalAirtimeDisbursedNgn: totalAirtime,
    totalSubmissions: mockSubmissionsStore.length,
    avgCaScore: avg,
  };
}

export async function fetchStudents(): Promise<StudentRow[]> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection('users').get();
      return snap.docs.map((d: any) => ({ uid: d.id, ...(d.data() as Omit<StudentRow, 'uid'>) }));
    } catch (e) {
      console.warn('Firestore fetch students warning:', e);
    }
  }
  return mockStudentsStore;
}

export async function fetchSubmissions(): Promise<SubmissionRow[]> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection('submissions').orderBy('submittedAt', 'desc').get();
      return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<SubmissionRow, 'id'>) }));
    } catch (e) {
      console.warn('Firestore fetch submissions warning:', e);
    }
  }
  return mockSubmissionsStore;
}

export async function fetchAirtimeTransactions(): Promise<AirtimeTxRow[]> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection('airtimeTransactions').orderBy('timestamp', 'desc').get();
      return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<AirtimeTxRow, 'id'>) }));
    } catch (e) {
      console.warn('Firestore fetch airtime transactions warning:', e);
    }
  }
  return mockAirtimeStore;
}
