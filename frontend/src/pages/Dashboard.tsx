import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJobs } from '../api/hooks';
import { StatusPill } from '../components/StatusPill';
import { DeadlineBadge } from '../components/DeadlineBadge';
import { STATUS_LABEL, formatDate } from '../lib/format';
import type { JobStatus } from '../api/types';

const STATUS_OPTIONS: Array<JobStatus | ''> = [
  '',
  'saved',
  'applied',
  'phone_screen',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];

export function Dashboard() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [tag, setTag] = useState('');

  const { data, isLoading, isError } = useJobs({
    q: q || undefined,
    status: status || undefined,
    tag: tag || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applications</h1>
        <div className="flex gap-2">
          <Link to="/discover" className="btn">🔎 Discover jobs</Link>
          <Link to="/jobs/new" className="btn btn-primary">+ Add Job</Link>
        </div>
      </div>

      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <input
          className="input max-w-xs"
          placeholder="Search company / position / description"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input max-w-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value as JobStatus | '')}
        >
          {STATUS_OPTIONS.map((s) =>
            s === '' ? (
              <option key="all" value="">All statuses</option>
            ) : (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ),
          )}
        </select>
        <input
          className="input max-w-xs"
          placeholder="Tag filter (e.g. react)"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
      </div>

      {isLoading && <div className="text-slate-500">Loading…</div>}
      {isError && <div className="text-rejected">Failed to load applications.</div>}

      {data && data.length === 0 && (
        <div className="card p-6 text-center text-slate-500">
          No applications yet. <Link to="/discover" className="text-applied underline">Discover jobs</Link>{' '}
          or <Link to="/jobs/new" className="text-applied underline">add one manually</Link>.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Applied</th>
                <th className="px-3 py-2">Next round</th>
                <th className="px-3 py-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              {data.map((j) => {
                const next = j.rounds.find((r) => r.status === 'scheduled');
                return (
                  <tr key={j.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link to={`/jobs/${j.id}`} className="font-medium hover:underline">{j.company}</Link>
                      <DeadlineBadge deadline={j.deadline} />
                    </td>
                    <td className="px-3 py-2">{j.position}</td>
                    <td className="px-3 py-2"><StatusPill status={j.status} /></td>
                    <td className="px-3 py-2">{formatDate(j.appliedAt)}</td>
                    <td className="px-3 py-2">{next ? formatDate(next.scheduledAt) : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {j.tags.map((t) => (
                          <span key={t} className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">{t}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
