import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompanies } from '../api/hooks';
import type { CompanyListItem } from '../api/types';

// Card grid of every enriched company in the system. Useful for spotting "I've applied to 4
// oil & gas companies in Houston" patterns. Search is client-side because the table is small
// (typically <200 rows for a single job seeker); switch to server-side filter if it grows past 1k.
export function Companies() {
  const [query, setQuery] = useState('');
  const { data: companies, isLoading } = useCompanies();

  const filtered = useMemo(() => {
    if (!companies) return [];
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.industry && c.industry.toLowerCase().includes(q)) ||
        (c.hqLocation && c.hqLocation.toLowerCase().includes(q)),
    );
  }, [companies, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Companies</h1>
        <input
          className="input max-w-sm"
          placeholder="Search by name, industry, or location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading && <div className="text-slate-400">Loading…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="card p-6 text-center text-slate-400">
          {companies && companies.length === 0
            ? 'No companies yet — import a job from Discover to get started.'
            : 'No matches for that search.'}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <CompanyCard key={c.id} company={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyCard({ company: c }: { company: CompanyListItem }) {
  const facts = [
    c.industry,
    c.hqLocation,
    c.foundedYear ? `Founded ${c.foundedYear}` : null,
  ].filter(Boolean);
  return (
    <Link
      to={`/companies/${c.id}`}
      className="card p-3 flex gap-3 hover:border-slate-500 transition"
    >
      <CompanyLogo domain={c.domain} name={c.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{c.name}</h3>
          <span className="text-xs text-slate-400 shrink-0">
            {c.applicationCount} app{c.applicationCount === 1 ? '' : 's'}
          </span>
        </div>
        {facts.length > 0 && (
          <div className="text-xs text-slate-400 truncate">{facts.join(' · ')}</div>
        )}
        {c.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
        )}
      </div>
    </Link>
  );
}

function CompanyLogo({ domain, name }: { domain: string | null; name: string }) {
  const [errored, setErrored] = useState(false);
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  if (!domain || errored) {
    return (
      <div className="h-10 w-10 shrink-0 rounded bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
        {letter}
      </div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt=""
      className="h-10 w-10 shrink-0 rounded object-contain bg-white border border-slate-700"
      onError={() => setErrored(true)}
    />
  );
}
