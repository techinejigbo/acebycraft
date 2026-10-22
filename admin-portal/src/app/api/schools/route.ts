import { NextResponse } from 'next/server';
import { fetchMasterSchools, saveMasterSchool, deleteMasterSchool } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

export async function GET() {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const schools = await fetchMasterSchools();
    return NextResponse.json({ success: true, schools });
  } catch (error: any) {
    console.error('Error fetching schools:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name || !body.code || !body.passcode) {
      return NextResponse.json({ success: false, error: 'School name, code, and passcode are required' }, { status: 400 });
    }
    const created = await saveMasterSchool(body);
    return NextResponse.json({ success: true, school: created });
  } catch (error: any) {
    console.error('Error saving school:', error);
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
      return NextResponse.json({ success: false, error: 'School ID is required' }, { status: 400 });
    }
    await deleteMasterSchool(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting school:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
