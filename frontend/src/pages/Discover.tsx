import { useMemo, useState } from 'react';
import { useDiscoverImport, useDiscoverSearch, type DiscoverSearchInput } from '../api/hooks';
import { formatSalaryRange, isJobType } from '../lib/format';
import type { DiscoverResult } from '../api/types';

const SITES = ['linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter'] as const;

// JobSpy uses these strings literally for `job_type`. Map empty → undefined to omit the param.
const JOB_TYPES = [
  { value: '', label: 'Any' },
  { value: 'fulltime', label: 'Full-time' },
  { value: 'parttime', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
] as const;

// Fixed page size — replaces the old user-facing "Results wanted" input. Pagination is now
// the affordance for "show me more"; 25 keeps the table digestible while still covering most
// fruitful searches in a couple of clicks.
const PAGE_SIZE = 25;

export function Discover() {
  // All inputs start blank so the user explicitly opts in to every filter — only `hoursOld` keeps
  // a default (72) because un-bounded JobSpy queries return stale results and rate-limit hard.
  const [sites, setSites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [hoursOld, setHoursOld] = useState<number | ''>(72);
  const [isRemote, setIsRemote] = useState(false);
  const [jobType, setJobType] = useState<string>('');
  const [includeKeywords, setIncludeKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');

  const search = useDiscoverSearch();
  const importJob = useDiscoverImport();
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  // Pagination state. results accumulates across "Load more" clicks; page tracks the next
  // offset to request. exhausted flips true once a page comes back with fewer than PAGE_SIZE
  // hits (the upstream is out of matches for these filters), and we hide the Load more button.
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [page, setPage] = useState(0);
  const [cached, setCached] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const toggleSite = (s: string) =>
    setSites((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const buildParams = (offset: number): DiscoverSearchInput => ({
    sites,
    searchTerm,
    location: location || undefined,
    resultsWanted: PAGE_SIZE,
    offset,
    hoursOld: hoursOld === '' ? undefined : hoursOld,
    isRemote,
    jobType: jobType || undefined,
  });

  const runSearch = async () => {
    const response = await search.mutateAsync(buildParams(0));
    setResults(response.results);
    setPage(1);
    setCached(response.cached);
    setExhausted(response.results.length < PAGE_SIZE);
  };

  const loadMore = async () => {
    const response = await search.mutateAsync(buildParams(page * PAGE_SIZE));
    // Dedup by (site, id) — JobSpy occasionally repeats a row across offsets, and React would
    // throw a duplicate-key warning if we let it through.
    setResults((prev) => {
      const seen = new Set(prev.map((p) => `${p.site}-${p.id}`));
      const next = response.results.filter((r) => !seen.has(`${r.site}-${r.id}`));
      return [...prev, ...next];
    });
    setPage((p) => p + 1);
    setCached(response.cached);
    setExhausted(response.results.length < PAGE_SIZE);
  };

  // Filter the accumulated results client-side. Matches title + company + description
  // (lowercased) against comma-separated keyword lists. Excludes win.
  const filteredResults = useMemo(() => {
    const includes = includeKeywords
      .toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    const excludes = excludeKeywords
      .toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    if (includes.length === 0 && excludes.length === 0) return results;
    return results.filter((r) => {
      const haystack = `${r.title ?? ''} ${r.company ?? ''} ${r.description ?? ''}`.toLowerCase();
      if (excludes.some((kw) => haystack.includes(kw))) return false;
      if (includes.length > 0 && !includes.some((kw) => haystack.includes(kw))) return false;
      return true;
    });
  }, [results, includeKeywords, excludeKeywords]);
  const hiddenCount = results.length - filteredResults.length;

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
      jobType: isJobType(r.job_type) ? r.job_type : undefined,
    });
    setImportedIds((prev) => new Set(prev).add(r.id));
  };

  const hasResults = results.length > 0;
  const initialSearch = !hasResults && search.isPending;

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
          <label className="text-xs font-medium text-slate-300">
            Job type
            <select
              className="input mt-1"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
            >
              {JOB_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-xs font-medium text-slate-300">
            Include keywords <span className="text-slate-500 font-normal">(comma-sep, any match keeps it)</span>
            <input
              className="input mt-1"
              placeholder="e.g. design, building, architecture"
              value={includeKeywords}
              onChange={(e) => setIncludeKeywords(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Exclude keywords <span className="text-slate-500 font-normal">(comma-sep, any match hides it)</span>
            <input
              className="input mt-1"
              placeholder="e.g. cloud, aws, software, devops"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} /> Remote only
          </label>
          <button className="btn btn-primary" onClick={runSearch} disabled={search.isPending || sites.length === 0}>
            {initialSearch ? 'Searching…' : 'Search'}
          </button>
          {hasResults && (
            <span className="text-xs text-slate-400">
              {hiddenCount > 0
                ? `Showing ${filteredResults.length} of ${results.length} loaded (${hiddenCount} hidden by filter)`
                : `${results.length} loaded`}
              {cached ? ' · cached' : ''}
              {exhausted ? ' · all results loaded' : ''}
            </span>
          )}
        </div>
      </div>

      {search.isError && (
        <div className="card border-rejected p-3 text-sm text-rejected">
          Search failed — the JobSpy sidecar returned an error. Check the backend logs.
        </div>
      )}

      {hasResults && filteredResults.length === 0 && (
        <div className="card p-4 text-sm text-slate-400">
          All {results.length} loaded result{results.length === 1 ? '' : 's'} were hidden by the include/exclude filter.
          Loosen the keywords above.
        </div>
      )}

      {filteredResults.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-slate-300">
              <tr>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">Site</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Salary</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => {
                const imported = importedIds.has(r.id);
                return (
                  <tr key={`${r.site}-${r.id}`} className="border-t border-slate-700 hover:bg-slate-900/50">
                    <td className="px-3 py-2">
                      {r.job_url ? (
                        <a href={r.job_url} target="_blank" rel="noreferrer" className="hover:underline font-medium">
                          {r.title ?? '—'}
                        </a>
                      ) : (
                        r.title ?? '—'
                      )}
                    </td>
                    <td className="px-3 py-2 capitalize">{r.site}</td>
                    <td className="px-3 py-2">{r.company ?? '—'}</td>
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

      {hasResults && !exhausted && (
        <div className="flex justify-center">
          <button
            className="btn btn-accent"
            onClick={loadMore}
            disabled={search.isPending}
          >
            {search.isPending ? 'Loading…' : `Load more (next ${PAGE_SIZE})`}
          </button>
        </div>
      )}
    </div>
  );
}
