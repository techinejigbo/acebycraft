import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('id');

    const firestore = getAdminFirestore();
    let masterSubjects: any[] = [];

    if (firestore) {
      try {
        const subSnap = await firestore.collection('subjects').orderBy('createdAt', 'desc').get();
        if (!subSnap.empty) {
          masterSubjects = subSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name,
              shortCode: data.shortCode || data.name.slice(0, 3).toUpperCase(),
              category: data.category || 'General',
              description: data.description || '',
              ...data,
            };
          });
        }
      } catch (e) {
        console.warn('Could not read master subjects for assessments:', e);
      }
    }

    // Specific cycle requested by assessment arena
    if (cycleId && firestore) {
      const doc = await firestore.collection('assessments').doc(cycleId).get();
      if (doc.exists) {
        const docData = doc.data() || {};
        const qSnap = await firestore
          .collection('assessments')
          .doc(cycleId)
          .collection('questions')
          .get();

        const questions = qSnap.docs.map((qd) => {
          const qData = qd.data();
          return {
            id: qd.id,
            questionText: qData.question || qData.questionText || '',
            topic: qData.topic || 'General Topic',
            options: qData.options || {},
            subjectKey: qData.subjectKey || docData.subject || 'general',
            subjectName: qData.subjectName || docData.subject || 'General Assessment',
          };
        });

        const nowMs = Date.now();
        let isStarted = true;
        if (docData.startTime) {
          const s = new Date(docData.startTime).getTime();
          if (!isNaN(s) && nowMs < s) isStarted = false;
        }

        let isExpired = false;
        if (docData.endTime) {
          const e = new Date(docData.endTime).getTime();
          if (!isNaN(e) && nowMs > e) isExpired = true;
        }

        const isOpen = Boolean(docData.isActive) && isStarted && !isExpired && questions.length > 0;

        return NextResponse.json({
          cycle: {
            id: doc.id,
            ...docData,
            questionCount: questions.length,
            questions,
            isOpen,
            isStarted,
            isExpired,
          },
          subjects: masterSubjects,
        });
      }
    }

    // Assessment listing & active cycle resolution for student dashboard
    let activeAssessments: any[] = [];
    if (firestore) {
      const assessSnap = await firestore
        .collection('assessments')
        .where('isActive', '==', true)
        .get();

      activeAssessments = assessSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Sort by updatedAt or createdAt desc
      activeAssessments.sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
    }

    let activeCandidate = activeAssessments[0] || null;
    let status: 'open' | 'upcoming' | 'closed' | 'not_set' = 'not_set';
    let statusMessage = 'The administrator has not published assessment questions for this week yet.';
    let canStart = false;

    if (activeCandidate && firestore) {
      // Fetch question count to ensure questions have actually been set
      const qSnap = await firestore
        .collection('assessments')
        .doc(activeCandidate.id)
        .collection('questions')
        .get();

      const questionCount = qSnap.size;
      activeCandidate.questionCount = questionCount;

      if (questionCount === 0) {
        status = 'not_set';
        statusMessage = 'Assessment questions are currently being configured by the teachers.';
        canStart = false;
      } else {
        const nowMs = Date.now();

        // 1. Check start time
        let isStarted = true;
        if (activeCandidate.startTime) {
          const s = new Date(activeCandidate.startTime).getTime();
          if (!isNaN(s) && nowMs < s) {
            isStarted = false;
          }
        }

        // 2. Check end time
        let isExpired = false;
        if (activeCandidate.endTime) {
          const e = new Date(activeCandidate.endTime).getTime();
          if (!isNaN(e) && nowMs > e) {
            isExpired = true;
          }
        }

        if (isExpired) {
          status = 'closed';
          statusMessage = "This week's continuous assessment closed on Sunday at 11:59 PM. Results are being announced.";
          canStart = false;
        } else if (!isStarted) {
          status = 'upcoming';
          statusMessage = 'Next continuous assessment opens this weekend (Saturday morning).';
          canStart = false;
        } else {
          status = 'open';
          statusMessage = "This week's continuous assessment is live! Closes Sunday at 11:59 PM.";
          canStart = true;
        }
      }
    }

    return NextResponse.json({
      activeAssessments,
      activeCycle: activeCandidate,
      status,
      statusMessage,
      canStart,
      subjects: masterSubjects,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch assessments.' },
      { status: 500 }
    );
  }
}
