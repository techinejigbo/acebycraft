import { NextResponse } from 'next/server';
import { fetchSubmissions } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const submissions = await fetchSubmissions();
    return NextResponse.json({ submissions });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch submissions';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
