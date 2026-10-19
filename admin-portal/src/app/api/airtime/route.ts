import { NextRequest, NextResponse } from 'next/server';
import { getAccountBalance, dispatchManualAirtime } from '@/lib/vtpass/admin';
import { fetchAirtimeTransactions, getAdminFirestore } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const [balanceData, transactions] = await Promise.all([
      getAccountBalance(),
      fetchAirtimeTransactions(),
    ]);

    return NextResponse.json({
      balance: balanceData,
      transactions,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch airtime records';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, amountNgn, network, transactionId } = body;

    if (!phone || !amountNgn) {
      return NextResponse.json(
        { error: 'Phone number and amount in NGN are required.' },
        { status: 400 }
      );
    }

    // Dispatch via VTpass
    const dispatchResult = await dispatchManualAirtime({
      phone,
      amountNgn: Number(amountNgn),
      network,
    });

    const txId = dispatchResult.transactionId || `MANUAL-${Date.now()}`;

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('airtimeTransactions').doc(txId).set({
          id: txId,
          submissionId: transactionId || 'manual_instructor_dispatch',
          userId: 'manual_dispatch',
          phone,
          amountNgn: Number(amountNgn),
          status: dispatchResult.success ? 'success' : 'failed',
          airtimeTxId: txId,
          reloadlyTxId: txId,
          timestamp: new Date().toISOString(),
          message: dispatchResult.message,
        });
      } catch (dbErr) {
        console.warn('[Airtime API] Firestore log warning:', dbErr);
      }
    }

    if (!dispatchResult.success) {
      return NextResponse.json(
        { error: dispatchResult.message, transactionId: txId },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: dispatchResult.message,
      transactionId: txId,
      status: 'success',
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Airtime dispatch failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
