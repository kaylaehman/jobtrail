import { daysUntil, deadlineTier } from '../lib/format';

// FR-7 in-app reminder badge. Two-tier escalation (per design call):
//   - overdue → red
//   - within 7 days → amber
//   - otherwise → no badge (the deadline column still shows the date)
export function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const tier = deadlineTier(deadline);
  if (tier === 'none' || tier === 'distant') return null;
  const d = daysUntil(deadline);
  if (tier === 'overdue') {
    return (
      <span className="ml-2 inline-flex items-center rounded-full bg-rejected/15 px-2 py-0.5 text-xs font-semibold text-rejected">
        🔴 Overdue
      </span>
    );
  }
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
      🟡 Due in {d}d
    </span>
  );
}
