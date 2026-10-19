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

export interface SchoolProfile {
  uid: string;
  role: 'school';
  name: string;
  code: string;
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
  minPercentage: number;
  winnerQuota?: number;
  amountNgn: number;
  currency: string;
  tieBreaker?: 'fastest_time_total' | string;
}

export interface QuestionData {
  id: string;
  subjectKey?: string;
  subjectName?: string;
  topic: string;
  questionText?: string;
  question?: string; // backwards compatibility
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
  durationMinutes: number;
  rewardRules: RewardConfig;
  subjectsAvailable: string[];
}

export interface AssessmentForm {
  id?: string;
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
  questions?: QuestionData[];
}

export interface StudentRow {
  uid: string;
  phone: string;
  displayName: string;
  schoolId?: string;
  schoolName?: string;
  schoolClass?: string;
  network?: string;
  totalAssessmentsTaken?: number;
  averageScorePercentage?: number;
  totalAirtimeWonNgn: number;
  lastActive?: string;
  studentId: string;
  totalCaScore: number;
  completedAssessmentsCount: number;
}

export interface SubmissionRow {
  id: string;
  cycleId: string;
  userId: string;
  studentName: string;
  phone: string;
  maskedPhone?: string;
  schoolId: string;
  schoolName: string;
  schoolClass?: string;
  network?: string;
  averagePercentage: number;
  totalCorrect: number;
  totalQuestions: number;
  totalTimeSpentSeconds: number;
  isEligibleForReward: boolean;
  rewardRank?: number;
  airtimeAwarded: boolean;
  airtimeAmountNgn: number;
  airtimeStatus: string;
  airtimeTxId?: string;
  submittedAt: string;
  antiCheatFlags?: string[];
  scorePercent?: number; // legacy compatibility
  subjectResults?: Record<string, {
    subjectKey: string;
    subjectName: string;
    score: number;
    percentage: number;
    timeSpentSeconds: number;
    incorrectQuestions?: any[];
  }>;
}

export interface AirtimeTxRow {
  id: string;
  submissionId?: string;
  userId?: string;
  studentName?: string;
  phone: string;
  network?: string;
  amountNgn: number;
  status: 'success' | 'failed' | 'sandbox_simulated' | 'pending';
  airtimeTxId?: string;
  reloadlyTxId?: string;
  timestamp: string;
  message?: string;
}

export interface AdminMetrics {
  totalStudents: number;
  registeredSchoolsCount?: number;
  activeCycleTitle?: string;
  activeAssessments?: number;
  totalAirtimeDisbursedNgn: number;
  totalSubmissions: number;
  eligibleWinnersCount?: number;
  schoolAverageBenchmark?: number;
  avgCaScore?: number;
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

export interface TeacherContribution {
  id: string;
  authorName: string;
  authorPhone: string;
  authorSchool?: string;
  subjectKey: string;
  subjectName: string;
  topic: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: OptionKey;
  explanation: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}
