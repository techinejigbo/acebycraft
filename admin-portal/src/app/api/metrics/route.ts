import { NextResponse } from 'next/server';
import { fetchAdminMetrics } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

export async function GET() {
  if (!(await isAuthenticatedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const metrics = await fetchAdminMetrics();
    return NextResponse.json({
      metrics,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch metrics';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
