import { NextResponse } from 'next/server';
import { fetchMasterTeachers, saveMasterTeacher, deleteMasterTeacher } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

export async function GET() {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const teachers = await fetchMasterTeachers();
    return NextResponse.json({ success: true, teachers });
  } catch (error: any) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name || !body.phone || !body.pass) {
      return NextResponse.json({ success: false, error: 'Teacher name, phone, and password are required' }, { status: 400 });
    }
    const created = await saveMasterTeacher(body);
    return NextResponse.json({ success: true, teacher: created });
  } catch (error: any) {
    console.error('Error saving teacher:', error);
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
      return NextResponse.json({ success: false, error: 'Teacher ID is required' }, { status: 400 });
    }
    await deleteMasterTeacher(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
