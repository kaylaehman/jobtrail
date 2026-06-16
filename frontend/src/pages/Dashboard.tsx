import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useJobs } from '../api/hooks';
import { StatusPill } from '../components/StatusPill';
import { DeadlineBadge } from '../components/DeadlineBadge';
import { JOB_TYPE_LABEL, STATUS_LABEL } from '../lib/format';
import { useAppSettings } from '../lib/settings-context';
import type { JobApplication, JobStatus, JobType } from '../api/types';

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

type SortKey = 'company' | 'position' | 'status' | 'applied' | 'jobType' | 'tags';
type SortDir = 'asc' | 'desc';

// Status order for sorting — follows pipeline progression so "Saved → Applied → … → Offer" sorts ascending.
const STATUS_RANK: Record<JobStatus, number> = {
  saved: 0,
  applied: 1,
  phone_screen: 2,
  interview: 3,
  offer: 4,
  rejected: 5,
  withdrawn: 6,
};

function getSortValue(j: JobApplication, key: SortKey): string | number | null {
  switch (key) {
    case 'company': return j.company.toLowerCase();
    case 'position': return j.position.toLowerCase();
    case 'status': return STATUS_RANK[j.status];
    case 'applied': return j.appliedAt ? new Date(j.appliedAt).getTime() : null;
    case 'jobType': return j.jobType ?? null;
    case 'tags': return j.tags[0]?.toLowerCase() ?? null;
  }
}

// Nulls always sort to the bottom so a column never "fills" with em-dashes at the top
// when toggled to ascending. Direction only affects the ordering of present values.
function compareJobs(a: JobApplication, b: JobApplication, key: SortKey, dir: SortDir): number {
  const va = getSortValue(a, key);
  const vb = getSortValue(b, key);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const cmp = va < vb ? -1 : va > vb ? 1 : 0;
  return dir === 'asc' ? cmp : -cmp;
}

function SortHeader({
  label, sortKey, sortBy, sortDir, onSort,
}: {
  label: string; sortKey: SortKey; sortBy: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortBy === sortKey;
  return (
    <th
      className="px-3 py-2 cursor-pointer select-none hover:bg-slate-700/40"
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={active ? 'text-slate-100' : 'text-slate-500'}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
    </th>
  );
}

export function Dashboard() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [tag, setTag] = useState('');
  const [industry, setIndustry] = useState('');
  const [jobType, setJobType] = useState<JobType | ''>('');
  const [sortBy, setSortBy] = useState<SortKey>('applied');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { formatDate } = useAppSettings();

  const { data, isLoading, isError } = useJobs({
    q: q || undefined,
    status: status || undefined,
    tag: tag || undefined,
    industry: industry || undefined,
    jobType: jobType || undefined,
  });

  const sorted = useMemo(() => {
    if (!data) return data;
    return [...data].sort((a, b) => compareJobs(a, b, sortBy, sortDir));
  }, [data, sortBy, sortDir]);

  const handleSort = (k: SortKey) => {
    if (k === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(k);
      // Date-y columns feel more natural as desc first (most recent at top).
      setSortDir(k === 'applied' ? 'desc' : 'asc');
    }
  };

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
        <input
          className="input max-w-xs"
          placeholder="Industry (comma-sep for multi)"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          title="Comma-separated industries (OR-matched). Only matches apps whose linked Company has an industry set."
        />
        <select
          className="input max-w-xs"
          value={jobType}
          onChange={(e) => setJobType(e.target.value as JobType | '')}
        >
          <option value="">All job types</option>
          {(Object.keys(JOB_TYPE_LABEL) as JobType[]).map((t) => (
            <option key={t} value={t}>{JOB_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="text-slate-400">Loading…</div>}
      {isError && <div className="text-rejected">Failed to load applications.</div>}

      {sorted && sorted.length === 0 && (
        <div className="card p-6 text-center text-slate-400">
          No applications yet. <Link to="/discover" className="text-applied underline">Discover jobs</Link>{' '}
          or <Link to="/jobs/new" className="text-applied underline">add one manually</Link>.
        </div>
      )}

      {sorted && sorted.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-slate-300">
              <tr>
                <SortHeader label="Position" sortKey="position" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Company" sortKey="company" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Status" sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Applied" sortKey="applied" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Job type" sortKey="jobType" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Tags" sortKey="tags" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((j) => {
                return (
                  <tr key={j.id} className="border-t border-slate-700 hover:bg-slate-900/40">
                    <td className="px-3 py-2">
                      <Link to={`/jobs/${j.id}`} className="font-medium hover:underline" title="View application">
                        {j.position}
                      </Link>
                      <DeadlineBadge deadline={j.deadline} />
                    </td>
                    <td className="px-3 py-2">
                      {j.companyId ? (
                        <Link
                          to={`/companies/${j.companyId}`}
                          className="hover:underline"
                          title="View company"
                        >
                          {j.company}
                        </Link>
                      ) : (
                        <span>{j.company}</span>
                      )}
                    </td>
                    <td className="px-3 py-2"><StatusPill status={j.status} /></td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(j.appliedAt)}</td>
                    <td className="px-3 py-2 text-slate-300">{j.jobType ? JOB_TYPE_LABEL[j.jobType] : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {j.tags.map((t) => (
                          <span key={t} className="rounded bg-slate-700 text-slate-100 px-1.5 py-0.5 text-xs">{t}</span>
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
