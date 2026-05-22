import type { JobStatus, RoundStatus, RoundType } from '../api/types';

export const STATUS_LABEL: Record<JobStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLOR: Record<JobStatus, string> = {
  saved: 'bg-saved',
  applied: 'bg-applied',
  phone_screen: 'bg-phone_screen',
  interview: 'bg-interview',
  offer: 'bg-offer',
  rejected: 'bg-rejected',
  withdrawn: 'bg-withdrawn',
};

export const ROUND_TYPE_LABEL: Record<RoundType, string> = {
  online_assessment: 'Online Assessment',
  hr_screen: 'HR Interview',
  technical: 'Technical Interview',
  manager: 'Manager Interview',
  final: 'Final Interview',
  other: 'Other',
};

// §8.2 icon set: ✅ Passed ❌ Rejected 🕐 Waiting 📅 Scheduled ⏰ Reminder
export const ROUND_STATUS_ICON: Record<RoundStatus, string> = {
  passed: '✅',
  rejected: '❌',
  waiting: '🕐',
  scheduled: '📅',
  completed: '✅',
};

export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  passed: 'Passed',
  rejected: 'Rejected',
  waiting: 'Awaiting Results',
  scheduled: 'Scheduled',
  completed: 'Completed',
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

// Two-tier deadline urgency (per user's design call): ≤7d amber, overdue red.
export type DeadlineTier = 'overdue' | 'soon' | 'distant' | 'none';

export function deadlineTier(iso: string | null | undefined, now: Date = new Date()): DeadlineTier {
  if (!iso) return 'none';
  const ms = new Date(iso).getTime() - now.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'distant';
}

export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number {
  if (!iso) return Number.NaN;
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
