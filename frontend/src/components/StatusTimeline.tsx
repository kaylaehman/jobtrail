import type { JobStatusEvent } from '../api/types';
import { StatusPill } from './StatusPill';
import { useAppSettings } from '../lib/settings-context';

// Vertical timeline of status transitions. The backend returns events newest-first; we keep
// that order so the most recent change is at the top, where the user looks first.
// Initial events (fromStatus null) render as "Created as <pill>" rather than an arrow.
export function StatusTimeline({ events }: { events: JobStatusEvent[] }) {
  const { formatDate } = useAppSettings();

  if (!events || events.length === 0) {
    return (
      <div className="text-sm text-slate-400 italic">
        No status history yet — transitions will be logged automatically.
      </div>
    );
  }

  return (
    <ol className="relative ml-2 space-y-3 border-l border-slate-600">
      {events.map((event) => (
        <li key={event.id} className="ml-4">
          <span
            aria-hidden
            className="absolute -left-[6px] mt-1.5 h-3 w-3 rounded-full border-2 border-slate-800 bg-slate-400 ring-1 ring-slate-600"
          />
          <time className="text-xs text-slate-400">{formatDate(event.createdAt)}</time>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {event.fromStatus ? (
              <>
                <StatusPill status={event.fromStatus} />
                <span className="text-slate-400" aria-label="changed to">→</span>
                <StatusPill status={event.toStatus} />
              </>
            ) : (
              <>
                <span className="text-xs text-slate-400">Created as</span>
                <StatusPill status={event.toStatus} />
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
