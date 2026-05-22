import { useState } from 'react';
import { useDiscoverImport, useDiscoverSearch } from '../api/hooks';
import { formatSalaryRange } from '../lib/format';
import type { DiscoverResult } from '../api/types';

const SITES = ['linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter'] as const;

export function Discover() {
  const [sites, setSites] = useState<string[]>(['linkedin', 'indeed']);
  const [searchTerm, setSearchTerm] = useState('software engineer');
  const [location, setLocation] = useState('Remote');
  const [resultsWanted, setResultsWanted] = useState(25);
  const [hoursOld, setHoursOld] = useState<number | ''>(72);
  const [isRemote, setIsRemote] = useState(true);

  const search = useDiscoverSearch();
  const importJob = useDiscoverImport();
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const toggleSite = (s: string) =>
    setSites((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const runSearch = () => {
    search.mutate({
      sites,
      searchTerm,
      location: location || undefined,
      resultsWanted,
      hoursOld: hoursOld === '' ? undefined : hoursOld,
      isRemote,
    });
  };

  const handleImport = async (r: DiscoverResult) => {
    if (!r.company || !r.title) return;
    await importJob.mutateAsync({
      source: r.site,
      sourceJobId: r.id,
      company: r.company,
      position: r.title,
      jobUrl: r.job_url ?? undefined,
      location: r.location ?? undefined,
      salaryMin: r.min_amount ?? undefined,
      salaryMax: r.max_amount ?? undefined,
      salaryCurrency: r.currency ?? undefined,
      remote: r.is_remote ?? undefined,
      description: r.description ?? undefined,
    });
    setImportedIds((prev) => new Set(prev).add(r.id));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Discover</h1>
      <p className="text-sm text-slate-400">
        Search jobs across LinkedIn, Indeed, Glassdoor, Google, and ZipRecruiter via JobSpy. Identical queries are
        cached for 10 minutes to avoid rate limits.
      </p>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {SITES.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={sites.includes(s)} onChange={() => toggleSite(s)} />
              <span className="capitalize">
                {s}{' '}
                {search.isPending && sites.includes(s) && (
                  <span className="inline-block animate-pulse text-slate-400" aria-label="searching">…</span>
                )}
              </span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <label className="text-xs font-medium text-slate-300">
            Search term
            <input
              className="input mt-1"
              placeholder="e.g. software engineer"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Location
            <input
              className="input mt-1"
              placeholder="e.g. Remote or Boston, MA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Results wanted
            <input
              className="input mt-1"
              type="number"
              min={1}
              max={200}
              value={resultsWanted}
              onChange={(e) => setResultsWanted(parseInt(e.target.value || '25', 10))}
            />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Max age (hours)
            <input
              className="input mt-1"
              type="number"
              min={1}
              placeholder="e.g. 72"
              value={hoursOld}
              onChange={(e) => setHoursOld(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} /> Remote only
          </label>
          <button className="btn btn-primary" onClick={runSearch} disabled={search.isPending || sites.length === 0}>
            {search.isPending ? 'Searching…' : 'Search'}
          </button>
          {search.data && (
            <span className="text-xs text-slate-400">
              {search.data.count} result{search.data.count === 1 ? '' : 's'}
              {search.data.cached ? ' · cached' : ''}
            </span>
          )}
        </div>
      </div>

      {search.isError && (
        <div className="card border-rejected p-3 text-sm text-rejected">
          Search failed — the JobSpy sidecar returned an error. Check the backend logs.
        </div>
      )}

      {search.data && search.data.results.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-slate-300">
              <tr>
                <th className="px-3 py-2">Site</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Salary</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {search.data.results.map((r) => {
                const imported = importedIds.has(r.id);
                return (
                  <tr key={`${r.site}-${r.id}`} className="border-t border-slate-700 hover:bg-slate-900/50">
                    <td className="px-3 py-2 capitalize">{r.site}</td>
                    <td className="px-3 py-2">{r.company ?? '—'}</td>
                    <td className="px-3 py-2">
                      {r.job_url ? (
                        <a href={r.job_url} target="_blank" rel="noreferrer" className="hover:underline">
                          {r.title ?? '—'}
                        </a>
                      ) : (
                        r.title ?? '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.location ?? '—'} {r.is_remote ? '· 🌐' : ''}
                    </td>
                    <td className="px-3 py-2">
                      {formatSalaryRange(r.min_amount, r.max_amount, r.currency)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button className="btn" disabled={imported} onClick={() => handleImport(r)}>
                        {imported ? '✅ Saved' : '💾 Save to tracker'}
                      </button>
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
