import { useEffect, useState } from 'react';
import { useAppSettings } from '../lib/settings-context';
import { useResetData } from '../api/hooks';
import { DATE_FORMAT_OPTIONS } from '../api/types';
import type { DateFormatOption } from '../api/types';
import { formatDateWithPattern } from '../lib/format';
import { ConfirmResetModal } from '../components/ConfirmResetModal';

const SAMPLE_ISO = new Date().toISOString();

export function Settings() {
  const { settings, isLoading, setDateFormat, setContactEmail } = useAppSettings();
  const [resetOpen, setResetOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaved, setEmailSaved] = useState(false);
  const resetMutation = useResetData();

  // Seed the draft from the loaded settings once. Subsequent typing replaces the draft;
  // settings refetches don't clobber an in-flight edit.
  useEffect(() => {
    if (settings?.contactEmail) setEmailDraft(settings.contactEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.id]);

  const submitEmail = async () => {
    setEmailError(null);
    setEmailSaved(false);
    const trimmed = emailDraft.trim();
    // Empty is allowed (clears it). Otherwise must look like an email — backend re-validates.
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('That does not look like a valid email address.');
      return;
    }
    try {
      await setContactEmail(trimmed);
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2000);
    } catch (err) {
      setEmailError((err as Error).message || 'Failed to save email.');
    }
  };

  if (isLoading || !settings) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div id="contact-email" className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold">Contact email <span className="text-xs font-normal text-amber-300">required</span></h2>
        <p className="text-sm text-slate-400">
          Used <strong>only</strong> as the contact address in the User-Agent header sent to upstream
          enrichment APIs (Wikipedia, Wikidata, and especially <strong>SEC EDGAR</strong>, which 403s
          requests that don't include a real email per their fair-use policy). Never displayed publicly,
          never emailed.
        </p>
        <div className="flex flex-wrap gap-2 items-start">
          <input
            type="email"
            className="input max-w-md"
            placeholder="you@example.com"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitEmail();
            }}
          />
          <button className="btn btn-primary" onClick={submitEmail}>
            Save
          </button>
        </div>
        {emailError && <div className="text-sm text-red-400">{emailError}</div>}
        {emailSaved && <div className="text-sm text-emerald-300">✓ Saved</div>}
        {!emailError && !emailSaved && settings.contactEmail && (
          <div className="text-xs text-slate-500">Currently saved: {settings.contactEmail}</div>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold">Date format</h2>
        <p className="text-sm text-slate-400">
          Choose how dates are displayed throughout JobTrail (applied date, deadlines, scheduled rounds).
        </p>

        <label className="block text-sm font-medium">
          Format
          <select
            className="input mt-1 max-w-md"
            value={settings.dateFormat}
            onChange={(e) => setDateFormat(e.target.value as DateFormatOption)}
          >
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} → {formatDateWithPattern(SAMPLE_ISO, opt)}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
          <span className="text-slate-400">Preview: </span>
          <span className="font-medium">{formatDateWithPattern(SAMPLE_ISO, settings.dateFormat)}</span>
        </div>
      </div>

      <div className="card p-4 space-y-2">
        <h2 className="text-lg font-semibold">Recently used tags</h2>
        <p className="text-sm text-slate-400">
          These show up as autocomplete suggestions when editing tags on a job.
        </p>
        {settings.recentTags.length === 0 ? (
          <div className="text-sm text-slate-500">No tags yet — add tags to a job to populate this list.</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {settings.recentTags.map((t) => (
              <span key={t} className="rounded bg-slate-700 text-slate-100 px-1.5 py-0.5 text-xs">{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4 space-y-3 border-l-4 border-l-red-500">
        <h2 className="text-lg font-semibold text-red-400">Danger zone</h2>
        <p className="text-sm text-slate-400">
          Starting a new job search? This wipes all your applications, interview rounds, status
          history, and enriched company data. Your settings stay.
        </p>
        <button
          className="btn bg-red-600 text-white hover:bg-red-700"
          onClick={() => setResetOpen(true)}
        >
          Reset all data…
        </button>
      </div>

      <ConfirmResetModal
        isOpen={resetOpen}
        isPending={resetMutation.isPending}
        result={resetMutation.data?.deleted ?? null}
        onClose={() => {
          setResetOpen(false);
          resetMutation.reset();
        }}
        onConfirm={(wipeEnrichmentCache) =>
          resetMutation.mutate({ confirm: 'DELETE_ALL_DATA', wipeEnrichmentCache })
        }
      />
    </div>
  );
}
