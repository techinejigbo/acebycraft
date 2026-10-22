import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const firestore = getAdminFirestore();
    if (firestore) {
      const snap = await firestore.collection('schools').orderBy('createdAt', 'desc').get();
      const schools = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          code: data.code,
          state: data.state,
          lga: data.lga,
        };
      });
      return NextResponse.json({ success: true, schools });
    }
    return NextResponse.json({ success: true, schools: [] });
  } catch (error: any) {
    console.error('Error fetching schools:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
