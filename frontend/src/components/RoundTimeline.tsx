import { useState } from 'react';
import clsx from 'clsx';
import type { InterviewRound } from '../api/types';
import {
  ROUND_STATUS_ICON,
  ROUND_STATUS_LABEL,
  ROUND_TYPE_LABEL,
  formatDate,
} from '../lib/format';

// §8.2 ASCII-tree timeline. Each round is one tree branch with ├/└ characters
// rendered in a monospaced font; details collapse via the chevron in the header.
export function RoundTimeline({
  rounds,
  onEdit,
  onDelete,
}: {
  rounds: InterviewRound[];
  onEdit?: (round: InterviewRound) => void;
  onDelete?: (roundId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (rounds.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        No interview rounds yet. Click "Add round" to start tracking.
      </div>
    );
  }

  return (
    <div className="timeline-mono text-sm">
      <div className="mb-2 text-slate-600">Round History:</div>
      {rounds.map((round, idx) => {
        const isLast = idx === rounds.length - 1;
        const branch = isLast ? '└─' : '├─';
        const rail = isLast ? '   ' : '│  ';
        const isCollapsed = collapsed[round.id] === true;
        const detailBranch = isCollapsed ? null : (
          <>
            <div className="whitespace-pre">
              {rail}
              {'├─ '}
              {[
                round.durationMinutes ? `Duration: ${round.durationMinutes} min` : null,
                round.interviewer ? `Interviewer: ${round.interviewer}` : null,
              ]
                .filter(Boolean)
                .join('  ') || '—'}
            </div>
            <div className="whitespace-pre-wrap">
              {rail}
              {'└─ '}Notes: {round.notes || <span className="italic text-slate-400">—</span>}
            </div>
          </>
        );

        return (
          <div key={round.id} className="group">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-left hover:bg-slate-100 rounded px-1 -mx-1"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [round.id]: !prev[round.id] }))
                }
              >
                <span className="whitespace-pre">
                  {branch} Round {round.roundNumber}: {ROUND_TYPE_LABEL[round.type]}{' '}
                  {ROUND_STATUS_ICON[round.status]} {ROUND_STATUS_LABEL[round.status]}
                  {round.scheduledAt ? ` (${formatDate(round.scheduledAt)})` : ''}
                </span>
              </button>
              <span className="invisible group-hover:visible flex items-center gap-1 text-xs">
                {onEdit && (
                  <button type="button" className="btn !py-0.5 !px-2 text-xs" onClick={() => onEdit(round)}>
                    ✏️ Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="btn !py-0.5 !px-2 text-xs"
                    onClick={() => {
                      if (confirm(`Delete round ${round.roundNumber}?`)) onDelete(round.id);
                    }}
                  >
                    🗑️
                  </button>
                )}
              </span>
            </div>
            {detailBranch}
            {!isLast && <div className={clsx('whitespace-pre', isCollapsed && 'hidden')}>{rail}</div>}
          </div>
        );
      })}
    </div>
  );
}
