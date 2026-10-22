import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

export async function GET() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({
        summary: { totalDisbursedNgn: 0, totalRecipientsCount: 0, pendingDisbursalsCount: 0 },
        pendingQueue: [],
        transactions: [],
      });
    }

    // 1. Fetch historical manual transactions
    const txSnap = await firestore
      .collection('airtimeTransactions')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const transactions = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Calculate totals from transactions
    let totalDisbursedNgn = 0;
    const recipientUids = new Set<string>();
    transactions.forEach((tx: any) => {
      if (tx.status === 'disbursed' || tx.status === 'success') {
        totalDisbursedNgn += Number(tx.amountNgn) || 0;
        if (tx.userId) recipientUids.add(tx.userId);
        if (tx.phone) recipientUids.add(tx.phone);
      }
    });

    // 2. Fetch submissions that qualified for airtime (score >= 80%) but have not been disbursed yet
    const pendingSnap = await firestore
      .collection('submissions')
      .where('isEligibleForReward', '==', true)
      .get();

    const pendingQueue: any[] = [];
    pendingSnap.docs.forEach((d) => {
      const data = d.data();
      if (!data.airtimeAwarded) {
        pendingQueue.push({
          submissionId: d.id,
          userId: data.userId || '',
          studentName: data.studentName || 'Student',
          phone: data.phone || '',
          network: data.network || 'MTN',
          schoolName: data.schoolName || 'Self',
          schoolClass: data.schoolClass || 'Senior Secondary',
          averagePercentage: data.averagePercentage || 0,
          totalTimeSpentSeconds: data.totalTimeSpentSeconds || 0,
          airtimeAmountNgn: data.airtimeAmountNgn || 1000,
          submittedAt: data.submittedAt || '',
        });
      }
    });

    // PRD Rule: All students with score >= 80% are eligible; rank strictly by fastest total completion time
    // (e.g. 80% in 2 mins ranks ahead of 100% in 3 mins). Use score as tie-breaker if times match.
    pendingQueue.sort((a, b) => {
      if (a.totalTimeSpentSeconds !== b.totalTimeSpentSeconds) {
        return a.totalTimeSpentSeconds - b.totalTimeSpentSeconds;
      }
      return b.averagePercentage - a.averagePercentage;
    });

    return NextResponse.json({
      summary: {
        totalDisbursedNgn,
        totalRecipientsCount: recipientUids.size,
        pendingDisbursalsCount: pendingQueue.length,
      },
      pendingQueue,
      transactions,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch airtime records';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      submissionId,
      userId,
      studentName,
      phone,
      amountNgn,
      network,
      referenceNote,
    } = body;

    if (!phone || !amountNgn) {
      return NextResponse.json(
        { error: 'Phone number and amount in NGN are required for manual disbursal.' },
        { status: 400 }
      );
    }

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    const txId = `DISB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const amount = Number(amountNgn);
    const nowIso = new Date().toISOString();

    const batch = firestore.batch();

    // 1. Record manual airtime transaction in audit ledger
    const txRef = firestore.collection('airtimeTransactions').doc(txId);
    batch.set(txRef, {
      id: txId,
      submissionId: submissionId || 'direct_manual_transfer',
      userId: userId || 'manual',
      studentName: studentName || 'Student',
      phone,
      network: network || 'MTN',
      amountNgn: amount,
      status: 'disbursed',
      method: 'manual_telecom_transfer',
      referenceNote: referenceNote?.trim() || 'Disbursed manually via bank/telecom VTU',
      timestamp: nowIso,
    });

    // 2. If tied to a specific assessment submission, update the submission record
    if (submissionId) {
      const subRef = firestore.collection('submissions').doc(submissionId);
      batch.update(subRef, {
        airtimeAwarded: true,
        airtimeAmountNgn: amount,
        airtimeStatus: 'disbursed',
        disbursedAt: nowIso,
        disbursedTxId: txId,
      });
    }

    // 3. If tied to a registered student profile, increment their total airtime earned
    if (userId && userId !== 'manual') {
      const userRef = firestore.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const currentAirtime = Number(userDoc.data()?.totalAirtimeWonNgn) || 0;
        batch.update(userRef, {
          totalAirtimeWonNgn: currentAirtime + amount,
          lastAirtimeDisbursedAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Manual airtime reward of ₦${amount} successfully recorded for ${phone}.`,
      transactionId: txId,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Airtime manual recording failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
