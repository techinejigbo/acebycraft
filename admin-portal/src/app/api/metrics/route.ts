import { NextResponse } from 'next/server';
import { fetchAdminMetrics } from '@/lib/firebase/admin';
import { getAccountBalance } from '@/lib/vtpass/admin';

export async function GET() {
  try {
    const [metrics, balanceData] = await Promise.all([
      fetchAdminMetrics(),
      getAccountBalance(),
    ]);

    return NextResponse.json({
      metrics,
      airtimeGateway: balanceData,
      reloadly: balanceData,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch metrics';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
