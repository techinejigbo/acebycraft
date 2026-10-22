import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, phone, pass, name, affiliation, primarySubject } = body;

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable' }, { status: 503 });
    }

    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    if (action === 'login') {
      const snap = await firestore.collection('teachers').get();
      const matched = snap.docs.find((d) => {
        const data = d.data();
        const dPhone = (data.phone || '').replace(/[^0-9]/g, '');
        return dPhone === cleanPhone || d.id === `tch-${cleanPhone}`;
      });

      if (!matched) {
        return NextResponse.json({ success: false, error: 'Educator phone number not registered. Please sign up or contact IT Admin.' }, { status: 404 });
      }

      const tData = matched.data();
      if (tData.pass && pass && tData.pass !== pass) {
        return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        teacher: {
          id: matched.id,
          name: tData.name,
          phone: tData.phone,
          affiliation: tData.affiliation || 'Independent Educator',
          primarySubject: tData.primarySubject || 'General',
          contributedCount: tData.contributedCount || 0,
          approvedCount: tData.approvedCount || 0,
        },
      });
    }

    if (action === 'register') {
      if (!name || !pass) {
        return NextResponse.json({ success: false, error: 'Name, phone, and password are required' }, { status: 400 });
      }

      const teacherId = `tch-${cleanPhone}`;
      const newTeacher = {
        id: teacherId,
        name: name.trim(),
        phone: phone.trim(),
        pass: pass.trim(),
        affiliation: affiliation?.trim() || 'Independent Educator',
        primarySubject: primarySubject || 'General',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await firestore.collection('teachers').doc(teacherId).set(newTeacher);

      return NextResponse.json({
        success: true,
        teacher: {
          id: teacherId,
          name: newTeacher.name,
          phone: newTeacher.phone,
          affiliation: newTeacher.affiliation,
          primarySubject: newTeacher.primarySubject,
          contributedCount: 0,
          approvedCount: 0,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in teacher auth:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
