import { useMemo } from 'react';
import { StatusPill } from './StatusPill';
import { useAppSettings } from '../lib/settings-context';
import type { JobNote, JobStatusEvent } from '../api/types';

// Per-job unified timeline — interleaves status events + notes by createdAt descending.
// Same dot-and-rail layout as the global /activity page; scoped to a single application so
// it skips the "which job" header that page needs. Cyan dots for notes (user-driven),
// slate dots for status events (system-driven).
export function JobActivityLog({
  events,
  notes,
  onDeleteNote,
}: {
  events: JobStatusEvent[];
  notes: JobNote[];
  onDeleteNote: (noteId: string) => void;
}) {
  const { formatDate } = useAppSettings();

  type Entry =
    | { kind: 'status'; id: string; createdAt: string; event: JobStatusEvent }
    | { kind: 'note'; id: string; createdAt: string; note: JobNote };

  const entries: Entry[] = useMemo(() => {
    const all: Entry[] = [
      ...events.map((e): Entry => ({ kind: 'status', id: e.id, createdAt: e.createdAt, event: e })),
      ...notes.map((n): Entry => ({ kind: 'note', id: n.id, createdAt: n.createdAt, note: n })),
    ];
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [events, notes]);

  if (entries.length === 0) {
    return (
      <div className="text-sm text-slate-400 italic">
        No activity yet — status changes and notes will appear here.
      </div>
    );
  }

  return (
    <ol className="relative ml-2 space-y-3 border-l border-slate-700 pt-1">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.id}`} className="ml-4 group">
          <span
            aria-hidden
            className={`absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-800 ring-1 ${
              entry.kind === 'note'
                ? 'bg-brand-sky ring-brand-sky/60'
                : 'bg-slate-400 ring-slate-600'
            }`}
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <time>{formatDate(entry.createdAt)}</time>
            {entry.kind === 'note' && (
              <button
                type="button"
                className="invisible group-hover:visible hover:text-rejected"
                onClick={() => onDeleteNote(entry.id)}
              >
                Delete
              </button>
            )}
          </div>
          {entry.kind === 'status' ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {entry.event.fromStatus ? (
                <>
                  <StatusPill status={entry.event.fromStatus} />
                  <span className="text-slate-500" aria-label="changed to">→</span>
                  <StatusPill status={entry.event.toStatus} />
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-400">Created as</span>
                  <StatusPill status={entry.event.toStatus} />
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-200 whitespace-pre-wrap mt-0.5">{entry.note.body}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
