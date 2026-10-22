import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { ABC_FULL_QUESTION_BANK } from '@/data/abc_subjects_catalog';
import { 
  OptionKey, 
  SubmissionPayload, 
  SubmissionResult, 
  SubjectResultBreakdown, 
  QuestionFeedbackItem 
} from '@/types';

export async function POST(req: NextRequest) {
  try {
    const payload: SubmissionPayload = await req.json();
    const { 
      cycleId, 
      studentDetails, 
      subjectsTaken = [], 
      answers = {}, 
      timeSpentPerSubjectSeconds = {}, 
      totalTimeSpentSeconds = 0,
      tabSwitchesCount = 0,
      antiCheatFlags = []
    } = payload;

    if (!cycleId || !studentDetails?.uid) {
      return NextResponse.json(
        { error: 'Incomplete submission payload. Missing cycleId or student details.' },
        { status: 400 }
      );
    }

    const firestore = getAdminFirestore();

    // 1. Enforce single-attempt restriction on the server
    if (firestore) {
      const existingSnap = await firestore
        .collection('submissions')
        .where('userId', '==', studentDetails.uid)
        .where('cycleId', '==', cycleId)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existingData = existingSnap.docs[0].data() as SubmissionResult;
        return NextResponse.json(existingData);
      }
    }

    let grandTotalCorrect = 0;
    let totalQuestionsCount = 0;
    const subjectResults: Record<string, SubjectResultBreakdown> = {};
    let minPercentage = 80;
    let airtimeAmountNgn = 1000;

    // 2. Check if this is an assessment authored in Firestore
    let firestoreKeyDoc: any = null;
    let firestoreAssessDoc: any = null;

    if (firestore) {
      const [keySnap, assessSnap] = await Promise.all([
        firestore.collection('answerKeys').doc(cycleId).get(),
        firestore.collection('assessments').doc(cycleId).get(),
      ]);

      if (keySnap.exists) {
        firestoreKeyDoc = keySnap.data();
      }
      if (assessSnap.exists) {
        firestoreAssessDoc = assessSnap.data();
      }
    }

    if (firestoreKeyDoc) {
      // --- Firestore Assessment Grading ---
      const keys: Record<string, string> = firestoreKeyDoc.keys || {};
      const explanations: Record<string, string> = firestoreKeyDoc.explanations || {};
      const rewardConfig = firestoreKeyDoc.rewardConfig || firestoreAssessDoc?.rewardConfig;

      if (rewardConfig?.minPercentage) minPercentage = Number(rewardConfig.minPercentage);
      if (rewardConfig?.amountNgn) airtimeAmountNgn = Number(rewardConfig.amountNgn);

      // Fetch questions from subcollection
      const qSnap = await firestore!
        .collection('assessments')
        .doc(cycleId)
        .collection('questions')
        .get();

      const questionsList = qSnap.docs.map((qd) => ({
        id: qd.id,
        questionText: qd.data().question || qd.data().questionText || '',
        topic: qd.data().topic || 'General Topic',
        options: qd.data().options || {},
      }));

      totalQuestionsCount = questionsList.length;
      let correctCount = 0;
      const allFeedback: QuestionFeedbackItem[] = [];
      const incorrectFeedback: QuestionFeedbackItem[] = [];

      // Answers could be keyed by question ID or flat answers
      const flatAnswers: Record<string, string> = {};
      Object.entries(answers).forEach(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          Object.assign(flatAnswers, v);
        } else {
          flatAnswers[k] = v as string;
        }
      });

      questionsList.forEach((q) => {
        const selected = flatAnswers[q.id] || null;
        const correct = keys[q.id];
        const isCorrect = selected === correct;

        if (isCorrect) correctCount += 1;

        const item: QuestionFeedbackItem = {
          questionId: q.id,
          questionText: q.questionText,
          topic: q.topic,
          selectedOption: (selected as OptionKey) || null,
          correctOption: (correct as OptionKey) || 'A',
          isCorrect,
          explanation: explanations[q.id] || 'Review syllabus materials for this concept.',
        };

        allFeedback.push(item);
        if (!isCorrect) incorrectFeedback.push(item);
      });

      grandTotalCorrect = correctCount;
      const subKey = firestoreAssessDoc?.subject || 'general';
      const subName = firestoreAssessDoc?.title || 'Continuous Assessment';

      subjectResults[subKey] = {
        subjectKey: subKey,
        subjectName: subName,
        score: correctCount,
        totalQuestions: totalQuestionsCount,
        percentage: totalQuestionsCount > 0 ? Math.round((correctCount / totalQuestionsCount) * 100) : 0,
        timeSpentSeconds: totalTimeSpentSeconds,
        incorrectQuestions: incorrectFeedback,
        allQuestionsFeedback: allFeedback,
      };

    } else {
      // --- Fallback Multi-Subject Bank Grading ---
      for (const subKey of subjectsTaken) {
        const bank = ABC_FULL_QUESTION_BANK[subKey] || [];
        const userAnswersForSub = (answers[subKey] as Record<string, OptionKey>) || {};
        let subCorrectCount = 0;
        const allFeedback: QuestionFeedbackItem[] = [];
        const incorrectFeedback: QuestionFeedbackItem[] = [];

        for (const q of bank) {
          totalQuestionsCount += 1;
          const selected = userAnswersForSub[q.id] || null;
          const isCorrect = selected === q.correctOption;

          if (isCorrect) subCorrectCount += 1;

          const item: QuestionFeedbackItem = {
            questionId: q.id,
            questionText: q.questionText,
            topic: q.topic,
            selectedOption: selected,
            correctOption: q.correctOption,
            isCorrect,
            explanation: q.explanation || 'Review curriculum text for this topic.',
          };

          allFeedback.push(item);
          if (!isCorrect) incorrectFeedback.push(item);
        }

        grandTotalCorrect += subCorrectCount;
        const subCount = bank.length || 1;
        const subPercentage = Math.round((subCorrectCount / subCount) * 100);

        subjectResults[subKey] = {
          subjectKey: subKey,
          subjectName: bank[0]?.subjectName || subKey,
          score: subCorrectCount,
          totalQuestions: bank.length,
          percentage: subPercentage,
          timeSpentSeconds: timeSpentPerSubjectSeconds[subKey] || 0,
          incorrectQuestions: incorrectFeedback,
          allQuestionsFeedback: allFeedback,
        };
      }
    }

    if (totalQuestionsCount === 0) totalQuestionsCount = 1;
    const averagePercentage = Math.round((grandTotalCorrect / totalQuestionsCount) * 100);
    const isAntiCheatViolated = tabSwitchesCount >= 5;
    const isEligibleForReward = averagePercentage >= minPercentage && !isAntiCheatViolated;

    // Mask phone for public leaderboard safety
    const rawPhone = studentDetails.phone || '';
    const maskedPhone = rawPhone.length >= 8 
      ? `${rawPhone.slice(0, 4)}***${rawPhone.slice(-3)}`
      : rawPhone;

    const submissionId = `sub_${cycleId}_${studentDetails.uid}_${Date.now()}`;
    const result: SubmissionResult = {
      id: submissionId,
      cycleId,
      userId: studentDetails.uid,
      studentName: studentDetails.displayName,
      phone: studentDetails.phone,
      maskedPhone,
      network: studentDetails.network || 'MTN',
      schoolId: studentDetails.schoolId || 'self',
      schoolName: studentDetails.schoolName || 'Self (Independent Learner)',
      schoolClass: studentDetails.schoolClass || 'Senior Secondary',
      subjectsTaken,
      subjectResults,
      totalCorrect: grandTotalCorrect,
      totalQuestions: totalQuestionsCount,
      averagePercentage,
      totalTimeSpentSeconds,
      isEligibleForReward,
      airtimeAwarded: false,
      airtimeAmountNgn: isEligibleForReward ? airtimeAmountNgn : 0,
      airtimeStatus: isEligibleForReward ? 'qualified_pending' : 'not_eligible',
      airtimeMessage: isEligibleForReward 
        ? 'Qualified for weekly speed tie-breaker rank and manual airtime reward.' 
        : `Score below required ${minPercentage}% merit benchmark.`,
      antiCheatFlags,
      submittedAt: new Date().toISOString(),
    };

    // Store in Firestore & atomically update student cumulative CA statistics
    if (firestore) {
      try {
        await firestore.collection('submissions').doc(submissionId).set(result);

        const userRef = firestore.collection('users').doc(studentDetails.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};

        const prevCount = Number(userData.totalAssessmentsTaken) || Number(userData.completedAssessmentsCount) || 0;
        const prevScore = Number(userData.totalCaScore) || 0;
        const newCount = prevCount + 1;
        const newScore = prevScore + grandTotalCorrect;
        const newAggregateAvg = Math.round(newScore / (newCount * (totalQuestionsCount || 10)) * 100);

        await userRef.set(
          {
            totalAssessmentsTaken: newCount,
            completedAssessmentsCount: newCount,
            totalCaScore: newScore,
            averageScorePercentage: newAggregateAvg,
            lastAverageScore: averagePercentage,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (fErr) {
        console.warn('Firestore submission write note:', fErr);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Grading API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to grade assessment.' },
      { status: 500 }
    );
  }
}
