import { Link } from 'react-router-dom';
import { useActivity } from '../api/hooks';
import { StatusPill } from '../components/StatusPill';
import { useAppSettings } from '../lib/settings-context';
import type { ActivityItem } from '../api/types';

// Global feed: every status transition + every note across every application, newest first.
// Mirrors the JobDetail timeline visually but adds the "which job" header to each item since
// they're not grouped by application here.
export function Activity() {
  const { data: items, isLoading } = useActivity();
  const { formatDate } = useAppSettings();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Activity</h1>
      <p className="text-sm text-slate-400">
        Combined log of status changes and your notes across every application — newest first.
      </p>

      {isLoading && <div className="text-slate-400">Loading…</div>}

      {items && items.length === 0 && (
        <div className="card p-6 text-center text-slate-400">
          No activity yet. Status changes and notes will appear here as they happen.
        </div>
      )}

      {items && items.length > 0 && (
        <ol className="relative ml-2 space-y-4 border-l border-slate-700">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`} className="ml-4">
              <span
                aria-hidden
                className={`absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-brand-navy ring-1 ${
                  item.type === 'note'
                    ? 'bg-brand-sky ring-brand-sky/60'
                    : 'bg-slate-400 ring-slate-600'
                }`}
              />
              <ActivityItemView item={item} formatDate={formatDate} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityItemView({
  item,
  formatDate,
}: {
  item: ActivityItem;
  formatDate: (iso: string) => string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          to={`/jobs/${item.jobApplicationId}`}
          className="font-medium hover:underline"
          title="Open application"
        >
          {item.jobCompany} <span className="text-slate-500">·</span>{' '}
          <span className="text-slate-300">{item.jobPosition}</span>
        </Link>
        <time className="text-xs text-slate-400">{formatDate(item.createdAt)}</time>
      </div>
      {item.type === 'status' ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          {item.fromStatus ? (
            <>
              <StatusPill status={item.fromStatus} />
              <span className="text-slate-500" aria-label="changed to">→</span>
              <StatusPill status={item.toStatus} />
            </>
          ) : (
            <>
              <span className="text-xs text-slate-400">Created as</span>
              <StatusPill status={item.toStatus} />
            </>
          )}
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-200 whitespace-pre-wrap leading-snug">
          {item.body}
        </p>
      )}
    </div>
  );
}
