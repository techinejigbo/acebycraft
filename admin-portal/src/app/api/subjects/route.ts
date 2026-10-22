import { NextResponse } from 'next/server';
import { fetchMasterSubjects, saveMasterSubject, deleteMasterSubject } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

export async function GET() {
  try {
    const subjects = await fetchMasterSubjects();
    return NextResponse.json({ success: true, subjects });
  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Subject name is required' }, { status: 400 });
    }
    const created = await saveMasterSubject(body);
    return NextResponse.json({ success: true, subject: created });
  } catch (error: any) {
    console.error('Error saving subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Subject ID is required' }, { status: 400 });
    }
    await deleteMasterSubject(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
