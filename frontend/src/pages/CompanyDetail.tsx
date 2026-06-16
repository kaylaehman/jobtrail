import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCompany, useJobs, useRefreshCompany } from '../api/hooks';
import { StatusPill } from '../components/StatusPill';
import { BackButton } from '../components/BackButton';
import { useAppSettings } from '../lib/settings-context';

// Standalone /companies/:id view. Mirrors the CompanyPanel layout on JobDetail but adds the
// list of applications at this company so users can see clusters ("I've applied to 4 roles
// at Chevron over the last year"). No matchStatus context — this is a global, per-company
// view rather than a per-application one.
export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useCompany(id);
  const refresh = useRefreshCompany();
  const { formatDate, formatCalendarDate } = useAppSettings();
  const { data: jobs } = useJobs(id ? { companyId: id } : {});

  if (isLoading || !company) return <div className="text-slate-400">Loading…</div>;

  const distinctSources = Array.from(new Set(Object.values(company.sources ?? {})));

  return (
    <div className="space-y-4">
      <BackButton fallback="/companies" />
      <div className="card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <CompanyLogo domain={company.domain} name={company.name} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{company.name}</h1>
            {(company.industry || company.hqLocation) && (
              <div className="text-sm text-slate-400">
                {[company.industry, company.hqLocation].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate(company.id)}
            title="Re-run enrichment"
          >
            {refresh.isPending ? '↻ Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {company.description && (
          <p className="text-sm text-slate-300 leading-snug">{company.description}</p>
        )}

        <CompanyFacts
          founded={company.foundedYear}
          employees={company.employees}
          revenueUsd={company.revenueUsd}
          revenueAsOf={company.revenueAsOf}
          website={company.website}
        />

        <div className="border-t border-slate-700 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {company.lastEnrichedAt
              ? `Updated ${formatDate(company.lastEnrichedAt)}`
              : 'Not yet enriched'}
            {distinctSources.length > 0 && ` · sources: ${distinctSources.join(', ')}`}
          </span>
          {company.wikipediaUrl && (
            <a
              href={company.wikipediaUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:no-underline"
            >
              Wikipedia ↗
            </a>
          )}
        </div>

        {company.enrichmentError && (
          <div className="text-xs text-amber-300">
            ⚠ enrichment had errors: {company.enrichmentError}
          </div>
        )}
      </div>

      <div className="card p-4 space-y-2">
        <h2 className="text-lg font-semibold">
          Applications {jobs && jobs.length > 0 && <span className="text-slate-400 text-sm">({jobs.length})</span>}
        </h2>
        {jobs && jobs.length === 0 && (
          <div className="text-sm text-slate-400">No applications linked to this company.</div>
        )}
        {jobs && jobs.length > 0 && (
          <ul className="divide-y divide-slate-700">
            {jobs.map((j) => (
              <li key={j.id} className="py-2">
                <Link
                  to={`/jobs/${j.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 hover:bg-slate-700/30 -mx-2 px-2 py-1 rounded"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{j.position}</span>
                    <span className="text-xs text-slate-400">
                      {j.appliedAt ? `Applied ${formatCalendarDate(j.appliedAt)}` : 'Not applied yet'}
                    </span>
                  </div>
                  <StatusPill status={j.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CompanyLogo({ domain, name }: { domain: string | null; name: string }) {
  const [errored, setErrored] = useState(false);
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  if (!domain || errored) {
    return (
      <div className="h-14 w-14 shrink-0 rounded bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-xl">
        {letter}
      </div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      className="h-14 w-14 shrink-0 rounded object-contain bg-white border border-slate-700"
      onError={() => setErrored(true)}
    />
  );
}

function CompanyFacts({
  founded,
  employees,
  revenueUsd,
  revenueAsOf,
  website,
}: {
  founded: number | null;
  employees: number | null;
  revenueUsd: string | null;
  revenueAsOf: string | null;
  website: string | null;
}) {
  const items = [
    founded ? `Founded ${founded}` : null,
    employees ? `${employees.toLocaleString()} employees` : null,
    formatRevenue(revenueUsd, revenueAsOf),
  ].filter(Boolean);
  if (items.length === 0 && !website) return null;
  return (
    <div className="text-sm text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((f, i) => (
        <span key={i}>{f}</span>
      ))}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noreferrer"
          className="text-brand-sky underline hover:no-underline"
        >
          {prettyDomain(website)} ↗
        </a>
      )}
    </div>
  );
}

function formatRevenue(usdString: string | null, asOf: string | null): string | null {
  if (!usdString) return null;
  const n = Number(usdString);
  if (!Number.isFinite(n) || n <= 0) return null;
  const formatted =
    n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B`
    : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
    : `$${n.toLocaleString()}`;
  const year = asOf ? new Date(asOf).getFullYear() : null;
  return year ? `${formatted} (FY${year})` : formatted;
}

function prettyDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
