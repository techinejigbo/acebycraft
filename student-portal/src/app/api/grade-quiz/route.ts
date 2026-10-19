import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { sendAirtimeReward } from '@/lib/vtpass/airtime';
import { OptionKey, SubmissionRequest, SubmissionResult } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: SubmissionRequest = await req.json();
    const { 
      assessmentId, 
      answers, 
      timeSpentSeconds = 0, 
      tabSwitchesCount = 0, 
      focusLossCount = 0, 
      fullScreenExitCount = 0, 
      studentDetails 
    } = body;

    if (!assessmentId || !answers || !studentDetails?.uid) {
      return NextResponse.json(
        { error: 'Missing required fields in submission payload.' },
        { status: 400 }
      );
    }

    const firestore = getAdminFirestore();
    let answerKeyData: {
      keys: Record<string, OptionKey>;
      explanations: Record<string, string>;
      title: string;
      rewardConfig: {
        airtimeEnabled: boolean;
        minPercentage: number;
        amountNgn: number;
        currency: string;
      };
      totalMarks: number;
    } | null = null;

    // 1. Try to fetch answerKey from secure Firestore collection
    if (firestore) {
      try {
        const keyDoc = await firestore.collection('answerKeys').doc(assessmentId).get();
        if (keyDoc.exists) {
          answerKeyData = keyDoc.data() as any;
        }
      } catch (err) {
        console.warn('[Grade API] Firestore read warning:', err);
      }
    }

    if (!answerKeyData) {
      return NextResponse.json(
        { error: `Assessment "${assessmentId}" answer key not found in database.` },
        { status: 404 }
      );
    }

    const { keys, explanations, title, rewardConfig, totalMarks } = answerKeyData;
    const questionIds = Object.keys(keys);
    const totalQuestions = questionIds.length;

    let correctCount = 0;
    const explanationsMap: any = {};

    for (const qId of questionIds) {
      const correct = keys[qId];
      const selected = answers[qId] || null;
      const isCorrect = selected === correct;
      if (isCorrect) {
        correctCount += 1;
      }

      explanationsMap[qId] = {
        selected,
        correct,
        isCorrect,
        explanation: explanations[qId] || 'No explanation provided.',
      };
    }

    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const caPointsEarned = Number(((correctCount / totalQuestions) * totalMarks).toFixed(1));

    // Anti-cheat assessment
    const antiCheatFlags: string[] = [];
    if (tabSwitchesCount >= 3) antiCheatFlags.push(`Tab switches: ${tabSwitchesCount}`);
    if (focusLossCount >= 3) antiCheatFlags.push(`Window focus lost: ${focusLossCount} times`);
    if (fullScreenExitCount >= 2) antiCheatFlags.push(`Fullscreen exited: ${fullScreenExitCount} times`);

    const isAntiCheatFlagged = tabSwitchesCount >= 3 || focusLossCount >= 4;
    const passedRewardThreshold = scorePercent >= (rewardConfig?.minPercentage || 80) && !isAntiCheatFlagged;

    let airtimeAwarded = false;
    let airtimeStatus: SubmissionResult['airtimeStatus'] = 'not_eligible';
    let airtimeMessage = 'Score below required reward threshold.';
    let airtimeTxId = '';

    if (isAntiCheatFlagged) {
      airtimeMessage = `Airtime withheld due to integrity violations: ${antiCheatFlags.join('; ')}`;
    } else if (passedRewardThreshold && rewardConfig?.airtimeEnabled) {
      // Dispatch airtime reward via VTpass
      const airtimeResult = await sendAirtimeReward({
        phone: studentDetails.phone,
        amountNgn: rewardConfig.amountNgn || 200,
        network: studentDetails.network,
      });

      airtimeAwarded = airtimeResult.success;
      airtimeStatus = airtimeResult.status;
      airtimeMessage = airtimeResult.message;
      airtimeTxId = airtimeResult.transactionId || '';
    }

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const submissionRecord: any = {
      id: submissionId,
      assessmentId,
      assessmentTitle: title,
      userId: studentDetails.uid,
      studentName: studentDetails.displayName || 'Biology Student',
      phone: studentDetails.phone,
      scorePercent,
      correctCount,
      totalQuestions,
      caPointsEarned,
      timeSpentSeconds,
      passedRewardThreshold,
      airtimeAwarded,
      airtimeAmountNgn: airtimeAwarded ? (rewardConfig?.amountNgn || 200) : 0,
      airtimeStatus,
      airtimeMessage,
      airtimeTxId,
      reloadlyTxId: airtimeTxId,
      tabSwitchesCount,
      focusLossCount,
      fullScreenExitCount,
      isFlagged: isAntiCheatFlagged,
      antiCheatFlags,
      submittedAt: new Date().toISOString(),
      explanations: explanationsMap,
    };

    // Save to Firestore if available
    if (firestore) {
      try {
        const batch = firestore.batch();

        // 1. Write submission
        const subRef = firestore.collection('submissions').doc(submissionId);
        batch.set(subRef, submissionRecord);

        // 2. Update or create user profile with cumulative CA points
        const userRef = firestore.collection('users').doc(studentDetails.uid);
        const userDoc = await userRef.get();
        const prevData = userDoc.exists ? userDoc.data() : {};
        const prevCa = Number(prevData?.totalCaScore) || 0;
        const prevAirtime = Number(prevData?.totalAirtimeWonNgn) || 0;
        const prevCompleted = Number(prevData?.completedAssessmentsCount) || 0;

        batch.set(userRef, {
          uid: studentDetails.uid,
          phone: studentDetails.phone || prevData?.phone || '',
          displayName: studentDetails.displayName || prevData?.displayName || 'Biology Student',
          studentId: studentDetails.studentId || prevData?.studentId || '',
          schoolClass: prevData?.schoolClass || 'SS 3 Science',
          network: studentDetails.network || prevData?.network || 'MTN',
          totalCaScore: Number((prevCa + caPointsEarned).toFixed(1)),
          totalAirtimeWonNgn: prevAirtime + (airtimeAwarded ? (rewardConfig?.amountNgn || 200) : 0),
          completedAssessmentsCount: prevCompleted + 1,
          lastActive: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        // 3. Log airtime transaction if awarded
        if (airtimeAwarded) {
          const airtimeRef = firestore.collection('airtimeTransactions').doc(airtimeTxId || `tx_${submissionId}`);
          batch.set(airtimeRef, {
            submissionId,
            userId: studentDetails.uid,
            phone: studentDetails.phone,
            amountNgn: rewardConfig?.amountNgn || 200,
            status: airtimeStatus,
            airtimeTxId,
            reloadlyTxId: airtimeTxId,
            timestamp: new Date().toISOString(),
          });
        }

        await batch.commit();
      } catch (dbErr) {
        console.warn('[Grade API] Firestore batch write warning:', dbErr);
      }
    }

    return NextResponse.json(submissionRecord);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Grade API] Uncaught grading error:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
