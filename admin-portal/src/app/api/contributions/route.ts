import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

export async function GET() {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ contributions: [], warning: 'Database service unavailable' });
    }

    const snap = await firestore
      .collection('teacherContributions')
      .orderBy('submittedAt', 'desc')
      .get();

    const contributions = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ contributions });
  } catch (error: any) {
    console.error('Error fetching teacher contributions in admin:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch contributions' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    await firestore.collection('teacherContributions').doc(id).update({
      status,
      reviewedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    console.error('Error updating contribution status in admin:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update status' }, { status: 500 });
  }
}
