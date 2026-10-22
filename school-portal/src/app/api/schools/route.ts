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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. SCHOOL SELF-REGISTRATION
    if (body.action === 'register' || (!body.code && body.name)) {
      const { name, state, lga, contactPerson, contactPhone, officialEmail, passcode } = body;
      if (!name || !state || !passcode) {
        return NextResponse.json(
          { success: false, error: 'School name, state, and access passcode are required' },
          { status: 400 }
        );
      }

      const firestore = getAdminFirestore();
      if (!firestore) {
        return NextResponse.json({ success: false, error: 'Database service unavailable' }, { status: 503 });
      }

      const statePrefix = (state.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'SCH').toUpperCase();
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const generatedCode = `ABC-${statePrefix}-${randomSuffix}`;
      const docId = `sch-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}-${randomSuffix}`;

      const newSchool = {
        id: docId,
        name: name.trim(),
        code: generatedCode,
        state: state.trim(),
        lga: (lga || 'General').trim(),
        contactPerson: (contactPerson || '').trim(),
        contactPhone: (contactPhone || '').trim(),
        officialEmail: (officialEmail || '').trim(),
        passcode: passcode.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firestore.collection('schools').doc(docId).set(newSchool);

      return NextResponse.json({
        success: true,
        school: {
          schoolId: docId,
          code: generatedCode,
          name: newSchool.name,
          state: newSchool.state,
          lga: newSchool.lga,
          loggedAt: new Date().toISOString(),
        },
        message: `School registered successfully! Your institutional code is ${generatedCode}.`,
      });
    }

    // 2. SCHOOL LOGIN WITH CODE & PASSCODE
    const { code, passcode } = body;
    if (!code || !passcode) {
      return NextResponse.json({ success: false, error: 'School code and passcode are required' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    if (firestore) {
      // Find school by code (case-insensitive)
      const snap = await firestore.collection('schools').get();
      const matchedDoc = snap.docs.find((d) => {
        const data = d.data();
        return (
          data.code?.toUpperCase() === code.trim().toUpperCase() ||
          d.id.toLowerCase() === code.trim().toLowerCase()
        );
      });

      if (!matchedDoc) {
        return NextResponse.json({ success: false, error: 'Institutional code not recognized' }, { status: 404 });
      }

      const schoolData = matchedDoc.data();
      if (schoolData.passcode !== passcode.trim()) {
        return NextResponse.json({ success: false, error: 'Invalid institutional access passcode' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        school: {
          schoolId: matchedDoc.id,
          code: schoolData.code,
          name: schoolData.name,
          state: schoolData.state,
          lga: schoolData.lga,
          loggedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Service temporarily unavailable' }, { status: 503 });
  } catch (error: any) {
    console.error('Error authenticating school:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
