import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const firestore = getAdminFirestore();
    if (firestore) {
      const snap = await firestore.collection('subjects').orderBy('createdAt', 'desc').get();
      const subjects = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          shortCode: data.shortCode,
          category: data.category,
          description: data.description,
        };
      });
      return NextResponse.json({ success: true, subjects });
    }
    return NextResponse.json({ success: true, subjects: [] });
  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
