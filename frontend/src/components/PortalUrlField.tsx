import { useEffect, useState } from 'react';
import { useUpdateJob } from '../api/hooks';

// Inline editable "Application Portal URL" — the company-careers-portal link the user revisits
// to check application status. Distinct from `jobUrl` (the public listing). Three visual states:
//   - has value:  clickable anchor + tiny ✏️ to switch to edit mode
//   - empty:      "+ Add application portal URL" button → edit mode
//   - editing:    input + Save / Cancel (Esc cancels, Enter saves)
export function PortalUrlField({ jobId, value }: { jobId: string; value: string | null }) {
  const updateJob = useUpdateJob(jobId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  // Keep draft in sync if the parent prop changes (e.g. after refetch) and we're not editing.
  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  const commit = () => {
    const trimmed = draft.trim();
    // Empty → null so the column clears rather than holding "". Hook accepts Partial<JobApplication>
    // and the field is `string | null`, so null flows through to Prisma as a real clear.
    updateJob.mutate(
      { applicationPortalUrl: trimmed || null },
      { onSuccess: () => setEditing(false) },
    );
  };

  const cancel = () => {
    setDraft(value ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Application Portal:</span>
        <input
          className="input flex-1 max-w-md"
          autoFocus
          type="url"
          placeholder="https://careers.company.com/me/applications"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary !py-1 !px-2 text-xs"
          disabled={updateJob.isPending}
          onClick={commit}
        >
          {updateJob.isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn !py-1 !px-2 text-xs" onClick={cancel}>
          Cancel
        </button>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="text-sm">
        <button
          type="button"
          className="text-slate-400 hover:text-slate-200 underline"
          onClick={() => setEditing(true)}
        >
          + Add application portal URL
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-400">Application Portal:</span>
      <a
        className="text-applied underline truncate max-w-md"
        href={value}
        target="_blank"
        rel="noreferrer"
        title={value}
      >
        {prettyUrl(value)} ↗
      </a>
      <button
        type="button"
        className="text-xs text-slate-400 hover:text-slate-200"
        onClick={() => setEditing(true)}
        title="Edit portal URL"
        aria-label="Edit application portal URL"
      >
        ✏️
      </button>
    </div>
  );
}

// Show just the host + path tail so the link doesn't visually overflow on long URLs with query
// strings (Workday, Greenhouse, etc. love to embed session tokens). Falls back to the raw string
// if the value isn't a parseable URL — covers users who paste mid-typing.
function prettyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return raw;
  }
}
