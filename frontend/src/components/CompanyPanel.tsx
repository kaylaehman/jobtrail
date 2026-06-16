import { useState } from 'react';
import type { Company, CompanyMatchStatus } from '../api/types';
import {
  useCompanyByApplication,
  useRefreshCompany,
  useUpdateJob,
} from '../api/hooks';
import { useAppSettings } from '../lib/settings-context';
import { CompanyPicker } from './CompanyPicker';

// Sidebar-style company profile on the JobDetail page. Three visual states driven by the
// application's companyMatchStatus:
//   - auto       → show enriched data + subtle "is this right?" prompt
//   - confirmed  → show enriched data + small ✓ badge
//   - rejected   → hide enriched data, show picker UI
// Enrichment is fire-and-forget on import, so the data may be null on first render — the hook
// polls every 3s until it lands.
export function CompanyPanel({
  jobId,
  matchStatus,
}: {
  jobId: string;
  matchStatus: CompanyMatchStatus;
}) {
  const { data: company, isLoading } = useCompanyByApplication(jobId);
  const refresh = useRefreshCompany();
  const updateJob = useUpdateJob(jobId);

  if (matchStatus === 'rejected') {
    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Company</h2>
          <button
            type="button"
            className="text-xs text-slate-400 underline hover:text-slate-200"
            onClick={() => updateJob.mutate({ companyMatchStatus: 'auto' })}
          >
            ↩ Restore auto-match
          </button>
        </div>
        <div className="text-sm text-amber-200 bg-amber-900/30 border border-amber-700/50 rounded p-2">
          Match was rejected — search for the right company below.
        </div>
        <CompanyPicker jobId={jobId} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-2">Company</h2>
        <div className="text-sm text-slate-400">Loading company data…</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="card p-4 space-y-2">
        <h2 className="text-lg font-semibold">Company</h2>
        <div className="text-sm text-slate-400">
          Enriching… data should appear within a few seconds.
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <CompanyLogo domain={company.domain} name={company.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold truncate">{company.name}</h2>
            {matchStatus === 'confirmed' && (
              <span className="text-xs text-emerald-200 bg-emerald-900/30 border border-emerald-700/50 rounded px-1.5 py-0.5">
                ✓ verified
              </span>
            )}
          </div>
          {(company.industry || company.hqLocation) && (
            <div className="text-sm text-slate-400">
              {[company.industry, company.hqLocation].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn !py-1 !px-2 text-xs"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate(company.id)}
          title="Re-run enrichment"
        >
          {refresh.isPending ? '↻…' : '↻'}
        </button>
      </div>

      {company.description && (
        <p className="text-sm text-slate-300 leading-snug line-clamp-4">
          {company.description}
        </p>
      )}

      <CompanyFacts company={company} />

      <CompanyFooter company={company} matchStatus={matchStatus} jobId={jobId} />
    </div>
  );
}

function CompanyLogo({ domain, name }: { domain: string | null; name: string }) {
  // Clearbit's keyless logo CDN. 404s on companies it doesn't have — fall back to a monogram.
  const [errored, setErrored] = useState(false);
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  if (!domain || errored) {
    return (
      <div className="h-12 w-12 shrink-0 rounded bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-semibold">
        {letter}
      </div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      className="h-12 w-12 shrink-0 rounded object-contain bg-white border border-slate-700"
      onError={() => setErrored(true)}
    />
  );
}

function CompanyFacts({ company }: { company: Company }) {
  const facts = [
    company.foundedYear ? `Founded ${company.foundedYear}` : null,
    company.employees ? `${company.employees.toLocaleString()} employees` : null,
    formatRevenue(company.revenueUsd, company.revenueAsOf),
  ].filter(Boolean);
  if (facts.length === 0 && !company.website) return null;
  return (
    <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
      {facts.map((f, i) => (
        <span key={i}>{f}</span>
      ))}
      {company.website && (
        <a
          href={company.website}
          target="_blank"
          rel="noreferrer"
          className="text-brand-sky underline hover:no-underline"
        >
          {prettyDomain(company.website)} ↗
        </a>
      )}
    </div>
  );
}

function CompanyFooter({
  company,
  matchStatus,
  jobId,
}: {
  company: Company;
  matchStatus: CompanyMatchStatus;
  jobId: string;
}) {
  const { formatDate } = useAppSettings();
  const updateJob = useUpdateJob(jobId);
  const distinctSources = Array.from(new Set(Object.values(company.sources ?? {})));
  return (
    <div className="border-t border-slate-700 pt-2 space-y-2">
      {company.enrichmentError && (
        <div className="text-xs text-amber-300">
          ⚠ enrichment had errors: {company.enrichmentError}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
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
      {matchStatus === 'auto' && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-300">Is this the right company?</span>
          <button
            type="button"
            className="btn !py-0.5 !px-2 text-xs"
            onClick={() => updateJob.mutate({ companyMatchStatus: 'confirmed' })}
          >
            ✓ Yes
          </button>
          <button
            type="button"
            className="btn !py-0.5 !px-2 text-xs"
            onClick={() => updateJob.mutate({ companyMatchStatus: 'rejected' })}
          >
            ✗ Wrong
          </button>
        </div>
      )}
      {matchStatus === 'confirmed' && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Verified — match locked in for re-imports.</span>
          <button
            type="button"
            className="text-slate-400 underline hover:text-slate-200"
            onClick={() => updateJob.mutate({ companyMatchStatus: 'auto' })}
            title="Drop verification — match returns to the auto state"
          >
            ↩ Unverify
          </button>
        </div>
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
