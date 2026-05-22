export type JobSource =
  | 'manual'
  | 'linkedin'
  | 'indeed'
  | 'glassdoor'
  | 'google'
  | 'ziprecruiter';

export type JobStatus =
  | 'saved'
  | 'applied'
  | 'phone_screen'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export type RoundType =
  | 'online_assessment'
  | 'hr_screen'
  | 'technical'
  | 'manager'
  | 'final'
  | 'other';

export type RoundStatus = 'scheduled' | 'completed' | 'passed' | 'rejected' | 'waiting';

export type CompanyMatchStatus = 'auto' | 'confirmed' | 'rejected';

export interface Company {
  id: string;
  domain: string | null;
  name: string;
  normalizedName: string;
  logoUrl: string | null;
  description: string | null;
  wikipediaUrl: string | null;
  wikidataQid: string | null;
  cik: string | null;
  employees: number | null;
  employeesAsOf: string | null;
  // BigInt — serialized as a string at the API boundary, parse to number for display.
  revenueUsd: string | null;
  revenueAsOf: string | null;
  foundedYear: number | null;
  hqLocation: string | null;
  industry: string | null;
  website: string | null;
  sources: Record<string, string>;
  lastEnrichedAt: string | null;
  enrichmentError: string | null;
}

export interface WikidataCandidate {
  qid: string;
  label: string;
  description: string;
}

export interface CompanyListItem extends Company {
  applicationCount: number;
}

export interface InterviewRound {
  id: string;
  jobApplicationId: string;
  roundNumber: number;
  type: RoundType;
  scheduledAt: string | null;
  durationMinutes: number | null;
  interviewer: string | null;
  status: RoundStatus;
  notes: string | null;
  createdAt: string;
}

export interface JobStatusEvent {
  id: string;
  jobApplicationId: string;
  // null = initial creation marker. Render as "Created as X" rather than "X → Y".
  fromStatus: JobStatus | null;
  toStatus: JobStatus;
  note: string | null;
  createdAt: string;
}

export interface ExtractedSkills {
  skills: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    cloud: string[];
    tools: string[];
  };
  experienceLevel: string | null;
  workArrangement: string | null;
  tags: string[];
}

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  source: JobSource;
  sourceJobId: string | null;
  jobUrl: string | null;
  companyUrl: string | null;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  remote: boolean;
  description: string | null;
  status: JobStatus;
  appliedAt: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  extractedSkills: ExtractedSkills | null;
  rounds: InterviewRound[];
  // Only populated by GET /jobs/:id (detail), not by GET /jobs (list) — guard with ?? [] at usage.
  statusEvents?: JobStatusEvent[];
  companyId: string | null;
  companyMatchStatus: CompanyMatchStatus;
}

export interface ResetSummary {
  jobApplications: number;
  interviewRounds: number;
  jobStatusEvents: number;
  companies: number;
  enrichmentCacheCleared: number;
}

export const DATE_FORMAT_OPTIONS = [
  'M/d/yy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'EEEE, MMM d, yyyy',
  'MMM d, yyyy',
  'd MMM yyyy',
] as const;

export type DateFormatOption = (typeof DATE_FORMAT_OPTIONS)[number];

export interface UserSettings {
  id: string;
  dateFormat: DateFormatOption;
  recentTags: string[];
  updatedAt: string;
}

export interface DiscoverResult {
  site: string;
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  job_url: string | null;
  description: string | null;
  is_remote: boolean | null;
  min_amount: number | null;
  max_amount: number | null;
  currency: string | null;
  date_posted: string | null;
  job_type: string | null;
}
