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

    if (cycleId && firestore) {
      const doc = await firestore.collection('assessments').doc(cycleId).get();
      if (doc.exists) {
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
          };
        });

        return NextResponse.json({
          cycle: {
            id: doc.id,
            ...doc.data(),
            questions,
          },
          subjects: masterSubjects,
        });
      }
    }

    // List all active assessments in Firestore
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
    }

    return NextResponse.json({
      activeAssessments,
      activeCycle: activeAssessments[0] || null,
      subjects: masterSubjects,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch assessments.' },
      { status: 500 }
    );
  }
}
