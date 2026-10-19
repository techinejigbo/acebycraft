import { SubjectMeta, QuestionData, WeeklyAssessmentCycle, OptionKey } from '@/types';

export const NIGERIAN_SUBJECTS: SubjectMeta[] = [
  {
    id: 'math',
    name: 'General Mathematics',
    shortCode: 'MATH',
    department: 'General',
    icon: 'Calculator',
    description: 'Algebra, Trigonometry, Statistics, Number Bases & Geometry.',
  },
  {
    id: 'english',
    name: 'English Language',
    shortCode: 'ENG',
    department: 'General',
    icon: 'BookOpen',
    description: 'Comprehension, Lexis & Structure, Synonyms, Antonyms, Oral Forms.',
  },
  {
    id: 'biology',
    name: 'Biology',
    shortCode: 'BIO',
    department: 'Science',
    icon: 'Dna',
    description: 'Cell biology, Genetics, Ecology, Organ systems, Evolution.',
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    shortCode: 'CHEM',
    department: 'Science',
    icon: 'FlaskConical',
    description: 'Atomic structure, Stoichiometry, Organic chemistry, Periodic table, Redox.',
  },
  {
    id: 'physics',
    name: 'Physics',
    shortCode: 'PHYS',
    department: 'Science',
    icon: 'Zap',
    description: 'Mechanics, Waves, Thermodynamics, Electricity, Quantum physics.',
  },
  {
    id: 'economics',
    name: 'Economics',
    shortCode: 'ECON',
    department: 'Commercial',
    icon: 'TrendingUp',
    description: 'Demand & Supply, Monetary policy, Macroeconomics, Public finance, Inflation.',
  },
  {
    id: 'government',
    name: 'Government',
    shortCode: 'GOVT',
    department: 'Arts',
    icon: 'Landmark',
    description: 'Constitutions, Political structures, Federalism, Public administration, Rule of Law.',
  },
  {
    id: 'literature',
    name: 'Literature in English',
    shortCode: 'LIT',
    department: 'Arts',
    icon: 'Feather',
    description: 'Poetry analysis, Drama, Prose, Literary devices, African literature.',
  },
  {
    id: 'civic',
    name: 'Civic Education',
    shortCode: 'CIVIC',
    department: 'General',
    icon: 'ShieldCheck',
    description: 'Citizenship, Human rights, Democratic values, National consciousness.',
  },
  {
    id: 'agric',
    name: 'Agricultural Science',
    shortCode: 'AGRIC',
    department: 'Science',
    icon: 'Sprout',
    description: 'Crop production, Animal husbandry, Soil science, Agricultural economics.',
  },
  {
    id: 'commerce',
    name: 'Commerce',
    shortCode: 'COMM',
    department: 'Commercial',
    icon: 'Briefcase',
    description: 'Trade, Banking, Insurance, Warehousing, International commerce.',
  },
  {
    id: 'accounting',
    name: 'Financial Accounting',
    shortCode: 'ACC',
    department: 'Commercial',
    icon: 'FileSpreadsheet',
    description: 'Ledgers, Trial balances, Depreciation, Final accounts, Partnership accounting.',
  },
];

export const INITIAL_REGISTERED_SCHOOLS: Array<{
  id: string;
  name: string;
  code: string;
  state: string;
  lga: string;
}> = [
  { id: 'sch-kings-college', name: "King's College Lagos", code: 'ABC-LAG-001', state: 'Lagos', lga: 'Lagos Island' },
  { id: 'sch-queens-college', name: "Queen's College Lagos", code: 'ABC-LAG-002', state: 'Lagos', lga: 'Yaba' },
  { id: 'sch-fgc-enugu', name: 'Federal Government College Enugu', code: 'ABC-ENU-005', state: 'Enugu', lga: 'Enugu North' },
  { id: 'sch-gv-ibadan', name: 'Government College Ibadan', code: 'ABC-OYO-012', state: 'Oyo', lga: 'Apata' },
  { id: 'sch-fgc-kano', name: 'Federal Government College Kano', code: 'ABC-KAN-003', state: 'Kano', lga: 'Kano Municipal' },
  { id: 'sch-gv-kaduna', name: 'Government College Kaduna', code: 'ABC-KAD-007', state: 'Kaduna', lga: 'Kaduna North' },
  { id: 'sch-fgc-ph', name: 'Federal Government College Port Harcourt', code: 'ABC-RIV-018', state: 'Rivers', lga: 'Port Harcourt' },
  { id: 'sch-edo-college', name: 'Edo College Benin City', code: 'ABC-EDO-004', state: 'Edo', lga: 'Oredo' },
  { id: 'sch-loyola-abuja', name: 'Loyola Jesuit College Abuja', code: 'ABC-ABJ-009', state: 'Abuja FCT', lga: 'Gwagwalada' },
  { id: 'sch-baptist-lagos', name: 'Baptist Academy Obanikoro', code: 'ABC-LAG-022', state: 'Lagos', lga: 'Somolu' },
];

export interface FullSubjectBank {
  [subjectKey: string]: QuestionData[];
}

export const CURRENT_WEEKLY_CYCLE: WeeklyAssessmentCycle = {
  id: 'abc-week-42',
  title: 'ABC Nigeria Weekly Academic Challenge — Week 42',
  cycleNumber: 42,
  description: 'National secondary continuous assessment across 9 selected subjects. 10 randomized objective questions per subject (90 total). Complete in a single attempt. Students scoring >=80% on average compete for the Top 10 airtime prizes by total completion speed!',
  startDate: '2026-10-16T00:00:00.000Z',
  endDate: '2026-10-25T23:59:59.000Z',
  isActive: true,
  durationMinutes: 90,
  rewardRules: {
    airtimeEnabled: true,
    minPercentage: 80,
    winnerQuota: 10,
    amountNgn: 1000,
    currency: 'NGN',
    tieBreaker: 'fastest_time_total',
  },
  subjectsAvailable: NIGERIAN_SUBJECTS.map((s) => s.id),
};
