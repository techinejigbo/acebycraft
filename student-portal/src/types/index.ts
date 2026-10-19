export type OptionKey = 'A' | 'B' | 'C' | 'D';
export type UserRole = 'student' | 'school' | 'admin' | 'teacher';

export interface SubjectMeta {
  id: string;
  name: string;
  shortCode: string;
  department: 'Science' | 'Arts' | 'Commercial' | 'General';
  icon: string;
  description: string;
}

export interface StudentProfile {
  uid: string;
  phone: string; // Registered Phone -> Username & Airtime Destination
  displayName: string;
  studentId?: string;
  schoolId: string; // School doc ID or 'self'
  schoolName: string;
  schoolClass?: string; // 'SS1' | 'SS2' | 'SS3' | 'JAMB/WAEC'
  network?: string; // MTN, Airtel, Glo, 9mobile
  whatsappConsent: boolean;
  preferredSubjects: string[]; // List of 9 subject IDs
  totalAssessmentsTaken: number;
  totalAirtimeWonNgn: number;
  averageScorePercentage?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolProfile {
  uid: string;
  role: 'school';
  name: string;
  code: string; // e.g. 'ABC-LAG-014'
  state: string;
  lga: string;
  adminEmail: string;
  adminPhone: string;
  verified: boolean;
  enrolledStudentsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RewardConfig {
  airtimeEnabled: boolean;
  minPercentage: number; // default: 80%
  winnerQuota: number;   // default: 10 students
  amountNgn: number;     // default: 1000 NGN
  currency: string;      // 'NGN'
  tieBreaker: 'fastest_time_total';
}

export interface ClientQuestion {
  id: string;
  subjectKey: string;
  subjectName: string;
  topic: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export interface QuestionData {
  id: string;
  subjectKey: string;
  subjectName: string;
  topic: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: OptionKey;
  explanation: string;
}

export interface WeeklyAssessmentCycle {
  id: string;
  title: string;
  cycleNumber: number;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  durationMinutes: number; // e.g. 90
  rewardConfig: RewardConfig;
  subjectsAvailable: SubjectMeta[];
}

export interface SubmissionPayload {
  cycleId: string;
  studentDetails: {
    uid: string;
    displayName: string;
    phone: string;
    network?: string;
    schoolId: string;
    schoolName: string;
    schoolClass?: string;
  };
  subjectsTaken: string[]; // exactly 9 subjects
  answers: Record<string, Record<string, OptionKey>>; // subjectKey -> questionId -> OptionKey
  timeSpentPerSubjectSeconds: Record<string, number>; // subjectKey -> seconds
  totalTimeSpentSeconds: number;
  tabSwitchesCount: number;
  antiCheatFlags: string[];
}

export interface SubmissionRequest {
  assessmentId: string;
  answers: Record<string, OptionKey>;
  timeSpentSeconds?: number;
  tabSwitchesCount?: number;
  focusLossCount?: number;
  fullScreenExitCount?: number;
  studentDetails: {
    uid: string;
    phone: string;
    displayName: string;
    studentId?: string;
    network?: string;
  };
}

export interface QuestionFeedbackItem {
  questionId: string;
  questionText: string;
  topic: string;
  selectedOption: OptionKey | null;
  correctOption: OptionKey;
  isCorrect: boolean;
  explanation: string;
}

export interface SubjectResultBreakdown {
  subjectKey: string;
  subjectName: string;
  score: number; // out of 10
  totalQuestions: number; // 10
  percentage: number; // 0-100%
  timeSpentSeconds: number;
  incorrectQuestions: QuestionFeedbackItem[];
  allQuestionsFeedback: QuestionFeedbackItem[];
}

export interface SubmissionResult {
  id: string;
  cycleId: string;
  userId: string;
  studentName: string;
  phone: string;
  maskedPhone: string;
  network: string;
  schoolId: string;
  schoolName: string;
  schoolClass?: string;
  subjectsTaken: string[];
  subjectResults: Record<string, SubjectResultBreakdown>;
  totalCorrect: number; // out of 90
  totalQuestions: number; // 90
  averagePercentage: number;
  totalTimeSpentSeconds: number;
  isEligibleForReward: boolean; // averagePercentage >= 80%
  rewardRank?: number;
  airtimeAwarded: boolean;
  airtimeAmountNgn: number;
  airtimeStatus: 'not_eligible' | 'qualified_pending' | 'credited' | 'sandbox_simulated' | 'claimed' | 'success' | 'failed' | 'pending';
  airtimeMessage?: string;
  airtimeTxId?: string;
  antiCheatFlags?: string[];
  submittedAt: string;
  
  // Backwards compatibility fields for legacy views
  assessmentId?: string;
  assessmentTitle?: string;
  scorePercent?: number;
  correctCount?: number;
  caPointsEarned?: number;
  tabSwitchesCount?: number;
  reloadlyTxId?: string;
  explanations?: Record<string, {
    selected: OptionKey | null;
    correct: OptionKey;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export interface PastSubmissionSummary {
  id: string;
  cycleId: string;
  cycleTitle: string;
  submittedAt: string;
  averagePercentage: number;
  totalTimeSpentSeconds: number;
  isEligibleForReward: boolean;
  airtimeAwarded: boolean;
  airtimeAmountNgn: number;
  airtimeStatus: string;
  subjectScores: {
    name: string;
    score: number;
    total: number;
    percentage: number;
  }[];
}

export interface PastSubmission {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  caPointsEarned: number;
  airtimeAwarded: boolean;
  airtimeAmountNgn: number;
  submittedAt: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  subject: string;
  classLevel: string;
  durationMinutes: number;
  isActive: boolean;
  isWeekendOnly: boolean;
  startTime: string;
  endTime: string;
  rewardConfig: RewardConfig;
  totalMarks?: number;
  questionCount?: number;
}

export interface SundayLeaderboardWinner {
  rank: number;
  studentName: string;
  maskedPhone: string;
  schoolName: string;
  averagePercentage: number;
  totalTimeFormatted: string;
  totalTimeSeconds: number;
  airtimeAmountNgn: number;
  network: string;
  status: string;
}

export interface SundayWeeklyReport {
  cycleId: string;
  cycleTitle: string;
  publishedAt: string;
  totalParticipants: number;
  eligibleWinnersCount: number;
  airtimeWinners: SundayLeaderboardWinner[];
  schoolRankings: {
    schoolId: string;
    schoolName: string;
    participantCount: number;
    schoolAveragePercentage: number;
    topStudentName: string;
  }[];
  frequentlyMissedTopics: {
    subject: string;
    topic: string;
    missRatePercentage: number;
    sampleQuestion: string;
  }[];
  whatsappBroadcastText: string;
}
