import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SubmissionResult } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    let submissions: SubmissionResult[] = [];

    if (firestore) {
      try {
        const snap = await firestore
          .collection('submissions')
          .where('userId', '==', userId)
          .get();

        submissions = snap.docs.map((doc: any) => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
          } as SubmissionResult;
        });

        // Sort in memory by submittedAt descending
        submissions.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
      } catch (err) {
        console.warn('[Submissions API] Firestore query notice:', err);
      }
    }

    return NextResponse.json({ submissions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch student submissions.' },
      { status: 500 }
    );
  }
}
