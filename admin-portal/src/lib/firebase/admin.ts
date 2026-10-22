import type { App, ServiceAccount } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { AssessmentForm, QuestionData, OptionKey, StudentRow, SubmissionRow, AirtimeTxRow, AdminMetrics, MasterSubject, MasterSchool, MasterTeacher } from '@/types';

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
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const { firestore } = loadFirebaseAdmin();
  return firestore.getFirestore(adminApp);
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
    subject: data.subject || 'General Curriculum',
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
    // If updating existing assessment, clear previous questions to prevent orphaned docs
    try {
      const existingQuestionsSnap = await firestore
        .collection('assessments')
        .doc(assessmentId)
        .collection('questions')
        .get();

      if (!existingQuestionsSnap.empty) {
        const deleteBatch = firestore.batch();
        existingQuestionsSnap.docs.forEach((d: any) => deleteBatch.delete(d.ref));
        await deleteBatch.commit();
      }
    } catch (cleanupErr) {
      console.warn('Could not cleanup previous questions (continuing):', cleanupErr);
    }

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

export async function fetchAssessmentWithSecretKey(id: string): Promise<AssessmentForm | null> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const assessDoc = await firestore.collection('assessments').doc(id).get();
      if (!assessDoc.exists) return null;

      const assessData = assessDoc.data()!;

      // Fetch answer keys & explanations
      const keyDoc = await firestore.collection('answerKeys').doc(id).get();
      const keyData = keyDoc.exists ? keyDoc.data() : null;
      const keys = (keyData?.keys as Record<string, string>) || {};
      const explanations = (keyData?.explanations as Record<string, string>) || {};

      // Fetch questions
      const questionsSnap = await firestore
        .collection('assessments')
        .doc(id)
        .collection('questions')
        .get();

      const questions: QuestionData[] = questionsSnap.docs.map((doc: any, idx: number) => {
        const q = doc.data();
        return {
          id: doc.id || `q${idx + 1}`,
          question: q.question || q.questionText || '',
          topic: q.topic || '',
          options: q.options || { A: '', B: '', C: '', D: '' },
          correctOption: (keys[doc.id] || 'A') as OptionKey,
          explanation: explanations[doc.id] || '',
        };
      });

      return {
        id,
        title: assessData.title || '',
        description: assessData.description || '',
        subject: assessData.subject || '',
        classLevel: assessData.classLevel || 'Senior Secondary',
        durationMinutes: assessData.durationMinutes || 15,
        isActive: assessData.isActive ?? true,
        isWeekendOnly: assessData.isWeekendOnly ?? false,
        startTime: assessData.startTime || new Date().toISOString(),
        endTime: assessData.endTime || new Date().toISOString(),
        rewardConfig: assessData.rewardConfig || {
          airtimeEnabled: true,
          minPercentage: 80,
          amountNgn: 200,
          currency: 'NGN',
        },
        questions,
      };
    } catch (e) {
      console.error('Failed to fetch assessment with secret key:', e);
      throw e;
    }
  }

  const mock = mockAssessmentsStore.find((a) => a.id === id);
  return mock || null;
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
      return snap.docs.map((d: any) => {
        const data = d.data();
        return {
          uid: d.id,
          studentId: data.studentId || data.matricNo || d.id.substring(0, 10).toUpperCase(),
          displayName: data.displayName || 'Unnamed Student',
          phone: data.phone || 'N/A',
          network: data.network || 'MTN',
          schoolId: data.schoolId || 'self',
          schoolName: data.schoolName || 'Self (Independent Learner)',
          schoolClass: data.schoolClass || 'Senior Secondary',
          totalCaScore: typeof data.totalCaScore === 'number' 
            ? data.totalCaScore 
            : (Number(data.averageScorePercentage) || 0),
          completedAssessmentsCount: typeof data.completedAssessmentsCount === 'number'
            ? data.completedAssessmentsCount
            : (Number(data.totalAssessmentsTaken) || 0),
          totalAirtimeWonNgn: Number(data.totalAirtimeWonNgn) || 0,
          lastActive: data.updatedAt || data.createdAt || new Date().toISOString(),
          ...data,
        };
      });
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

// Master Subjects Store
let mockSubjectsStore: MasterSubject[] = [];

export async function fetchMasterSubjects(): Promise<MasterSubject[]> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection('subjects').orderBy('createdAt', 'desc').get();
      return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<MasterSubject, 'id'>) }));
    } catch (e) {
      console.warn('Firestore fetch subjects warning:', e);
    }
  }
  return mockSubjectsStore;
}

export async function saveMasterSubject(data: Omit<MasterSubject, 'createdAt'> & { id?: string }): Promise<MasterSubject> {
  const firestore = getAdminFirestore();
  const subId = data.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const subjectRecord: MasterSubject = {
    id: subId,
    name: data.name.trim(),
    shortCode: (data.shortCode || data.name.slice(0, 3)).toUpperCase().trim(),
    category: data.category || 'core',
    description: data.description || '',
    createdAt: new Date().toISOString(),
  };

  if (firestore) {
    await firestore.collection('subjects').doc(subId).set(subjectRecord);
  } else {
    mockSubjectsStore = [subjectRecord, ...mockSubjectsStore.filter((s) => s.id !== subId)];
  }
  return subjectRecord;
}

export async function deleteMasterSubject(id: string): Promise<boolean> {
  const firestore = getAdminFirestore();
  if (firestore) {
    await firestore.collection('subjects').doc(id).delete();
  }
  mockSubjectsStore = mockSubjectsStore.filter((s) => s.id !== id);
  return true;
}

// Master Schools Store
let mockSchoolsStore: MasterSchool[] = [];

export async function fetchMasterSchools(): Promise<MasterSchool[]> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection('schools').orderBy('createdAt', 'desc').get();
      return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<MasterSchool, 'id'>) }));
    } catch (e) {
      console.warn('Firestore fetch schools warning:', e);
    }
  }
  return mockSchoolsStore;
}

export async function saveMasterSchool(data: Omit<MasterSchool, 'createdAt'> & { id?: string }): Promise<MasterSchool> {
  const firestore = getAdminFirestore();
  const schoolId = data.id || `sch-${Date.now().toString().slice(-6)}`;
  const schoolRecord: MasterSchool = {
    id: schoolId,
    name: data.name.trim(),
    code: data.code.toUpperCase().trim(),
    passcode: data.passcode.trim(),
    state: data.state.trim(),
    lga: data.lga.trim(),
    contactEmail: data.contactEmail?.trim() || '',
    contactPhone: data.contactPhone?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  if (firestore) {
    await firestore.collection('schools').doc(schoolId).set(schoolRecord);
  } else {
    mockSchoolsStore = [schoolRecord, ...mockSchoolsStore.filter((s) => s.id !== schoolId)];
  }
  return schoolRecord;
}

export async function deleteMasterSchool(id: string): Promise<boolean> {
  const firestore = getAdminFirestore();
  if (firestore) {
    await firestore.collection('schools').doc(id).delete();
  }
  mockSchoolsStore = mockSchoolsStore.filter((s) => s.id !== id);
  return true;
}

// Master Teachers Store
let mockTeachersStore: MasterTeacher[] = [];

export async function fetchMasterTeachers(): Promise<MasterTeacher[]> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection('teachers').orderBy('createdAt', 'desc').get();
      return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<MasterTeacher, 'id'>) }));
    } catch (e) {
      console.warn('Firestore fetch teachers warning:', e);
    }
  }
  return mockTeachersStore;
}

export async function saveMasterTeacher(data: Omit<MasterTeacher, 'createdAt'> & { id?: string }): Promise<MasterTeacher> {
  const firestore = getAdminFirestore();
  const teacherId = data.id || `tch-${data.phone.replace(/[^0-9]/g, '') || Date.now().toString().slice(-4)}`;
  const teacherRecord: MasterTeacher = {
    id: teacherId,
    name: data.name.trim(),
    phone: data.phone.trim(),
    pass: data.pass.trim(),
    affiliation: data.affiliation?.trim() || 'Independent Educator',
    primarySubject: data.primarySubject || 'General',
    status: data.status || 'active',
    createdAt: new Date().toISOString(),
  };

  if (firestore) {
    await firestore.collection('teachers').doc(teacherId).set(teacherRecord);
  } else {
    mockTeachersStore = [teacherRecord, ...mockTeachersStore.filter((t) => t.id !== teacherId)];
  }
  return teacherRecord;
}

export async function deleteMasterTeacher(id: string): Promise<boolean> {
  const firestore = getAdminFirestore();
  if (firestore) {
    await firestore.collection('teachers').doc(id).delete();
  }
  mockTeachersStore = mockTeachersStore.filter((t) => t.id !== id);
  return true;
}

