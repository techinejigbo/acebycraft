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
      subjectsTaken, 
      answers, 
      timeSpentPerSubjectSeconds = {}, 
      totalTimeSpentSeconds = 0,
      tabSwitchesCount = 0,
      antiCheatFlags = []
    } = payload;

    if (!cycleId || !studentDetails?.uid || !subjectsTaken || subjectsTaken.length === 0) {
      return NextResponse.json(
        { error: 'Incomplete submission payload. Missing cycleId, student details, or subjects.' },
        { status: 400 }
      );
    }

    let grandTotalCorrect = 0;
    const totalQuestions = 90; // 9 subjects * 10 questions
    const subjectResults: Record<string, SubjectResultBreakdown> = {};

    // Grade each subject
    for (const subKey of subjectsTaken) {
      const bank = ABC_FULL_QUESTION_BANK[subKey] || [];
      const userAnswersForSub = answers[subKey] || {};
      let subCorrectCount = 0;
      const allFeedback: QuestionFeedbackItem[] = [];
      const incorrectFeedback: QuestionFeedbackItem[] = [];

      for (const q of bank) {
        const selected = userAnswersForSub[q.id] || null;
        const isCorrect = selected === q.correctOption;

        if (isCorrect) {
          subCorrectCount += 1;
        }

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
        if (!isCorrect) {
          incorrectFeedback.push(item);
        }
      }

      grandTotalCorrect += subCorrectCount;
      const subScore = subCorrectCount;
      const subPercentage = Math.round((subCorrectCount / 10) * 100);

      subjectResults[subKey] = {
        subjectKey: subKey,
        subjectName: bank[0]?.subjectName || subKey,
        score: subScore,
        totalQuestions: 10,
        percentage: subPercentage,
        timeSpentSeconds: timeSpentPerSubjectSeconds[subKey] || 0,
        incorrectQuestions: incorrectFeedback,
        allQuestionsFeedback: allFeedback,
      };
    }

    const averagePercentage = Math.round((grandTotalCorrect / totalQuestions) * 100);
    const isAntiCheatViolated = tabSwitchesCount >= 5;
    const isEligibleForReward = averagePercentage >= 80 && !isAntiCheatViolated;

    // Mask phone e.g. 0803***4567
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
      schoolClass: studentDetails.schoolClass || 'SS 3',
      subjectsTaken,
      subjectResults,
      totalCorrect: grandTotalCorrect,
      totalQuestions,
      averagePercentage,
      totalTimeSpentSeconds,
      isEligibleForReward,
      airtimeAwarded: false,
      airtimeAmountNgn: isEligibleForReward ? 1000 : 0,
      airtimeStatus: isEligibleForReward ? 'qualified_pending' : 'not_eligible',
      airtimeMessage: isEligibleForReward 
        ? 'Qualified for weekly Sunday night speed tie-breaker rank.' 
        : 'Score below required 80% benchmark.',
      antiCheatFlags,
      submittedAt: new Date().toISOString(),
    };

    // Store in Firestore if available
    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('submissions').doc(submissionId).set(result);

        // Update user stats
        await firestore.collection('users').doc(studentDetails.uid).set(
          {
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
