import { NextResponse } from 'next/server';
import { fetchStudents } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

export async function GET() {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const students = await fetchStudents();
    return NextResponse.json({ students });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch students';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
