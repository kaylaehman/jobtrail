import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useCreateNote,
  useCreateRound,
  useDeleteJob,
  useDeleteNote,
  useDeleteRound,
  useJob,
  useUpdateJob,
  useUpdateRound,
} from '../api/hooks';
import { StatusPill } from '../components/StatusPill';
import { DeadlineBadge } from '../components/DeadlineBadge';
import { RoundTimeline } from '../components/RoundTimeline';
import { StatusTimeline } from '../components/StatusTimeline';
import { CompanyPanel } from '../components/CompanyPanel';
import { SkillChips } from '../components/SkillChips';
import {
  JOB_TYPE_LABEL,
  ROUND_STATUS_LABEL,
  ROUND_TYPE_LABEL,
  STATUS_LABEL,
} from '../lib/format';
import { useAppSettings } from '../lib/settings-context';
import type { InterviewRound, JobStatus, RoundStatus, RoundType } from '../api/types';

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id);
  const updateJob = useUpdateJob(id ?? '');
  const deleteJob = useDeleteJob();
  const createRound = useCreateRound(id ?? '');
  const updateRound = useUpdateRound(id ?? '');
  const deleteRound = useDeleteRound(id ?? '');
  const createNote = useCreateNote(id ?? '');
  const deleteNote = useDeleteNote(id ?? '');
  const [editingRound, setEditingRound] = useState<InterviewRound | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [newNoteDraft, setNewNoteDraft] = useState('');
  const { formatDate } = useAppSettings();

  if (isLoading || !job) return <div className="text-slate-400">Loading…</div>;

  // §8.2 application status overview header
  const totalRounds = job.rounds.length;
  const currentRound = job.rounds.findIndex((r) => r.status === 'waiting' || r.status === 'scheduled');
  const progressLabel =
    totalRounds === 0
      ? 'No rounds yet'
      : currentRound >= 0
        ? `In Progress (Round ${currentRound + 1}/${totalRounds})`
        : `Completed (${totalRounds}/${totalRounds})`;
  const nextScheduled = job.rounds.find((r) => r.status === 'scheduled');

  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs uppercase text-slate-400">
              Application Status: {progressLabel}
              {nextScheduled?.scheduledAt && ` | Next: ${formatDate(nextScheduled.scheduledAt)}`}
            </div>
            <div className="text-xl font-bold mt-1">
              {job.company}{' '}
              <span className="text-slate-500">|</span> {job.position}
              <DeadlineBadge deadline={job.deadline} />
            </div>
            <div className="text-sm text-slate-400 mt-1">
              <StatusPill status={job.status} />{' '}
              {job.jobType && <span className="ml-2">🕒 {JOB_TYPE_LABEL[job.jobType]}</span>}
              {job.location && <span className="ml-2">📍 {job.location}</span>}
              {job.remote && <span className="ml-2">🌐 Remote</span>}
              {job.jobUrl && (
                <a className="ml-2 text-applied underline" href={job.jobUrl} target="_blank" rel="noreferrer">
                  Source ↗
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="input max-w-xs"
              value={job.status}
              onChange={(e) => updateJob.mutate({ status: e.target.value as JobStatus })}
            >
              {(Object.keys(STATUS_LABEL) as JobStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <Link className="btn" to={`/jobs/${job.id}/edit`}>✏️ Edit</Link>
            <button
              className="btn"
              onClick={() => {
                if (confirm(`Delete ${job.company} - ${job.position}?`)) {
                  deleteJob.mutate(job.id, { onSuccess: () => navigate('/') });
                }
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      <CompanyPanel jobId={job.id} matchStatus={job.companyMatchStatus} />

      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold">Notes</h2>
        <div className="space-y-2">
          <textarea
            className="input min-h-[5rem]"
            placeholder="Recruiter said they'll get back next week. Spoke with hiring manager about team structure. Etc."
            value={newNoteDraft}
            onChange={(e) => setNewNoteDraft(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!newNoteDraft.trim() || createNote.isPending}
            onClick={async () => {
              await createNote.mutateAsync(newNoteDraft.trim());
              setNewNoteDraft('');
            }}
          >
            {createNote.isPending ? 'Saving…' : '+ Add note'}
          </button>
        </div>
        {job.notes && job.notes.length > 0 && (
          <ol className="space-y-2 pt-1">
            {job.notes.map((n) => (
              <li
                key={n.id}
                className="group border-l-2 border-slate-700 pl-3 py-1 hover:border-brand-sky"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <time>{formatDate(n.createdAt)}</time>
                  <button
                    type="button"
                    className="invisible group-hover:visible hover:text-rejected"
                    onClick={() => {
                      if (confirm('Delete this note?')) deleteNote.mutate(n.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap mt-0.5">{n.body}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold">Status history</h2>
        <StatusTimeline events={job.statusEvents ?? []} />
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rounds</h2>
          <button
            className="btn btn-primary"
            onClick={() =>
              createRound.mutate({
                type: 'other',
                status: 'scheduled',
              })
            }
          >
            + Add round
          </button>
        </div>
        <RoundTimeline
          rounds={job.rounds}
          onEdit={(r) => {
            setEditingRound(r);
            setNotesDraft(r.notes ?? '');
          }}
          onDelete={(rid) => deleteRound.mutate(rid)}
        />
      </div>

      {editingRound && (
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold">Edit Round {editingRound.roundNumber}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-sm">
              Type
              <select
                className="input mt-1"
                value={editingRound.type}
                onChange={(e) =>
                  setEditingRound({ ...editingRound, type: e.target.value as RoundType })
                }
              >
                {(Object.keys(ROUND_TYPE_LABEL) as RoundType[]).map((t) => (
                  <option key={t} value={t}>{ROUND_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Status
              <select
                className="input mt-1"
                value={editingRound.status}
                onChange={(e) =>
                  setEditingRound({ ...editingRound, status: e.target.value as RoundStatus })
                }
              >
                {(Object.keys(ROUND_STATUS_LABEL) as RoundStatus[]).map((s) => (
                  <option key={s} value={s}>{ROUND_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Scheduled at
              <input
                className="input mt-1"
                type="datetime-local"
                value={editingRound.scheduledAt ? editingRound.scheduledAt.slice(0, 16) : ''}
                onChange={(e) =>
                  setEditingRound({
                    ...editingRound,
                    scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
            </label>
            <label className="text-sm">
              Duration (min)
              <input
                className="input mt-1"
                type="number"
                value={editingRound.durationMinutes ?? ''}
                onChange={(e) =>
                  setEditingRound({
                    ...editingRound,
                    durationMinutes: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Interviewer
              <input
                className="input mt-1"
                value={editingRound.interviewer ?? ''}
                onChange={(e) => setEditingRound({ ...editingRound, interviewer: e.target.value })}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Notes / feedback
              <textarea
                className="input mt-1 min-h-[6rem]"
                value={notesDraft ?? ''}
                onChange={(e) => setNotesDraft(e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!editingRound) return;
                await updateRound.mutateAsync({
                  id: editingRound.id,
                  type: editingRound.type,
                  status: editingRound.status,
                  scheduledAt: editingRound.scheduledAt ?? undefined,
                  durationMinutes: editingRound.durationMinutes ?? undefined,
                  interviewer: editingRound.interviewer ?? undefined,
                  notes: notesDraft ?? undefined,
                });
                setEditingRound(null);
              }}
            >
              Save
            </button>
            <button className="btn" onClick={() => setEditingRound(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {job.extractedSkills && (
        <div className="card p-4">
          <SkillChips
            skills={job.extractedSkills}
            onChange={(next) => updateJob.mutate({ extractedSkills: next })}
          />
        </div>
      )}

      {job.description && (
        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">Job description</summary>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{job.description}</pre>
        </details>
      )}
    </div>
  );
}
