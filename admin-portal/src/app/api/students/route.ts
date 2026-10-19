import { NextResponse } from 'next/server';
import { fetchStudents } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const students = await fetchStudents();
    return NextResponse.json({ students });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch students';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
