import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { CURRENT_WEEKLY_CYCLE, NIGERIAN_SUBJECTS } from '@/data/abc_subjects_catalog';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('id');

    const firestore = getAdminFirestore();

    if (cycleId) {
      if (firestore) {
        try {
          const doc = await firestore.collection('assessments').doc(cycleId).get();
          if (doc.exists) {
            return NextResponse.json({
              cycle: { id: doc.id, ...doc.data() },
              subjects: NIGERIAN_SUBJECTS,
            });
          }
        } catch (err) {
          console.warn('Firestore cycle query notice:', err);
        }
      }

      return NextResponse.json({
        cycle: CURRENT_WEEKLY_CYCLE,
        subjects: NIGERIAN_SUBJECTS,
      });
    }

    return NextResponse.json({
      activeCycle: CURRENT_WEEKLY_CYCLE,
      subjects: NIGERIAN_SUBJECTS,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch assessment cycle.' },
      { status: 500 }
    );
  }
}
