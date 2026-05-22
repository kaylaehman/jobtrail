import { useEffect, useState } from 'react';
import { useCompanySearch, useLinkCompany } from '../api/hooks';

// Wikidata-backed search-and-pick UI. Used inside CompanyPanel when the user has rejected the
// auto-matched company. Picking a candidate hits /jobs/:id/link-company, which marks the match
// `confirmed` and triggers a fresh enrichment via the QID Wikidata returned.
export function CompanyPicker({ jobId }: { jobId: string }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  // 250ms debounce — fast enough to feel live, slow enough to avoid hammering wbsearchentities
  // on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isLoading } = useCompanySearch(debounced);
  const linkCompany = useLinkCompany(jobId);

  return (
    <div className="space-y-2">
      <input
        className="input"
        placeholder="Search Wikidata for the right company…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {debounced.length >= 2 && isLoading && (
        <div className="text-sm text-slate-500">Searching…</div>
      )}
      {results && results.length === 0 && debounced.length >= 2 && !isLoading && (
        <div className="text-sm text-slate-500">No matches — try a different spelling.</div>
      )}
      {results && results.length > 0 && (
        <div className="rounded-md border border-slate-200 max-h-80 overflow-y-auto divide-y divide-slate-100">
          {results.map((c) => (
            <button
              key={c.qid}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
              disabled={linkCompany.isPending}
              onClick={() => linkCompany.mutate(c.qid)}
            >
              <div className="font-medium">{c.label}</div>
              {c.description && (
                <div className="text-xs text-slate-500 truncate">{c.description}</div>
              )}
              <div className="text-[10px] text-slate-400 mt-0.5">{c.qid}</div>
            </button>
          ))}
        </div>
      )}
      {linkCompany.isError && (
        <div className="text-sm text-red-600">
          Failed to link company: {(linkCompany.error as Error).message}
        </div>
      )}
    </div>
  );
}
