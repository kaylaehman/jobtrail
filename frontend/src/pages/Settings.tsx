import { useAppSettings } from '../lib/settings-context';
import { DATE_FORMAT_OPTIONS } from '../api/types';
import type { DateFormatOption } from '../api/types';
import { formatDateWithPattern } from '../lib/format';

const SAMPLE_ISO = new Date().toISOString();

export function Settings() {
  const { settings, isLoading, setDateFormat } = useAppSettings();

  if (isLoading || !settings) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card p-4 space-y-3">
        <h2 className="text-lg font-semibold">Date format</h2>
        <p className="text-sm text-slate-600">
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

        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Preview: </span>
          <span className="font-medium">{formatDateWithPattern(SAMPLE_ISO, settings.dateFormat)}</span>
        </div>
      </div>

      <div className="card p-4 space-y-2">
        <h2 className="text-lg font-semibold">Recently used tags</h2>
        <p className="text-sm text-slate-600">
          These show up as autocomplete suggestions when editing tags on a job.
        </p>
        {settings.recentTags.length === 0 ? (
          <div className="text-sm text-slate-400">No tags yet — add tags to a job to populate this list.</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {settings.recentTags.map((t) => (
              <span key={t} className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
