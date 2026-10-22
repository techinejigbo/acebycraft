import { NextResponse } from 'next/server';
import { fetchSubmissions } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

export async function GET() {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const submissions = await fetchSubmissions();
    return NextResponse.json({ submissions });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch submissions';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
