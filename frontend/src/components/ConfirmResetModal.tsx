import { useState } from 'react';
import type { ResetSummary } from '../api/types';

const REQUIRED_PHRASE = 'DELETE_ALL_DATA';

// Type-to-confirm modal. The user has to literally type DELETE_ALL_DATA before the destructive
// button enables — same string the backend validator checks, so what you type IS what the API
// sees. No "are you sure?" can be misclicked away.
export function ConfirmResetModal({
  isOpen,
  isPending,
  result,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  isPending: boolean;
  result: ResetSummary | null;
  onClose: () => void;
  onConfirm: (wipeEnrichmentCache: boolean) => void;
}) {
  const [typed, setTyped] = useState('');
  const [wipeCache, setWipeCache] = useState(false);

  if (!isOpen) return null;
  const isValid = typed === REQUIRED_PHRASE;

  // Show the post-reset summary once the mutation succeeds.
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="card max-w-md w-full p-6 space-y-3">
          <h2 className="text-xl font-bold">Data cleared</h2>
          <ul className="text-sm space-y-0.5">
            <li>{result.jobApplications} application{result.jobApplications === 1 ? '' : 's'}</li>
            <li>{result.interviewRounds} interview round{result.interviewRounds === 1 ? '' : 's'}</li>
            <li>{result.jobStatusEvents} status event{result.jobStatusEvents === 1 ? '' : 's'}</li>
            <li>{result.companies} compan{result.companies === 1 ? 'y' : 'ies'}</li>
            {result.enrichmentCacheCleared > 0 && (
              <li>{result.enrichmentCacheCleared} cached API response{result.enrichmentCacheCleared === 1 ? '' : 's'}</li>
            )}
          </ul>
          <p className="text-sm text-slate-400">Your settings (date format, recent tags) were preserved.</p>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={() => { setTyped(''); setWipeCache(false); onClose(); }}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-red-400">⚠️ Reset all data</h2>
        <p className="text-sm">This permanently deletes:</p>
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li>All job applications</li>
          <li>All interview rounds</li>
          <li>All status history</li>
          <li>All enriched company data</li>
        </ul>
        <p className="text-sm text-slate-400">
          Your settings (date format, recent tags) will be preserved.
        </p>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={wipeCache}
            onChange={(e) => setWipeCache(e.target.checked)}
            disabled={isPending}
          />
          <span>
            Also clear the HTTP cache for company-enrichment APIs.
            <span className="block text-xs text-slate-400">
              Slower next enrichment run; usually leave unchecked.
            </span>
          </span>
        </label>

        <label className="block text-sm">
          Type <code className="rounded bg-slate-900 border border-slate-700 px-1">{REQUIRED_PHRASE}</code> to confirm:
          <input
            className="input mt-1 font-mono"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            disabled={isPending}
            spellCheck={false}
            autoComplete="off"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            className="btn"
            disabled={isPending}
            onClick={() => { setTyped(''); setWipeCache(false); onClose(); }}
          >
            Cancel
          </button>
          <button
            className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            disabled={!isValid || isPending}
            onClick={() => onConfirm(wipeCache)}
          >
            {isPending ? 'Deleting…' : 'Permanently delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
