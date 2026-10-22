import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const schoolCode = searchParams.get('code');

    if (!schoolId || schoolId === 'all') {
      return NextResponse.json(
        { error: 'Valid institutional schoolId is required.' },
        { status: 400 }
      );
    }

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({
        submissions: [],
        warning: 'Database service unavailable',
      });
    }

    let snap = await firestore
      .collection('submissions')
      .where('schoolId', '==', schoolId)
      .get();

    // Fallback match by schoolCode if provided
    if (snap.empty && schoolCode) {
      snap = await firestore
        .collection('submissions')
        .where('schoolCode', '==', schoolCode)
        .get();
    }

    const submissions = snap.docs.map((doc) => {
      const data = doc.data();
      const rawPhone = data.phone || '';
      const maskedPhone = rawPhone.length >= 8
        ? `${rawPhone.slice(0, 4)}***${rawPhone.slice(-3)}`
        : '***';

      return {
        id: doc.id,
        ...data,
        phone: maskedPhone, // Protect student phone numbers
      };
    });

    return NextResponse.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error: any) {
    console.error('[School Submissions API error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch school submissions' },
      { status: 500 }
    );
  }
}
