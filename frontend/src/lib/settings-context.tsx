import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSettings, useUpdateSettings } from '../api/hooks';
import { formatDateWithPattern } from './format';
import type { DateFormatOption, UserSettings } from '../api/types';

interface SettingsContextValue {
  settings: UserSettings | undefined;
  isLoading: boolean;
  // Render an ISO timestamp using the user's preferred date format.
  // Falls back to yyyy-MM-dd while settings are still loading so the UI never flashes raw ISO.
  formatDate: (iso: string | null | undefined) => string;
  setDateFormat: (fmt: DateFormatOption) => Promise<void>;
  setContactEmail: (email: string) => Promise<void>;
  recordTags: (tags: string[]) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();

  const pattern = data?.dateFormat ?? 'yyyy-MM-dd';

  const formatDate = useCallback(
    (iso: string | null | undefined) => formatDateWithPattern(iso, pattern),
    [pattern],
  );

  const setDateFormat = useCallback(
    async (fmt: DateFormatOption) => {
      await update.mutateAsync({ dateFormat: fmt });
    },
    [update],
  );

  const setContactEmail = useCallback(
    async (email: string) => {
      await update.mutateAsync({ contactEmail: email });
    },
    [update],
  );

  const recordTags = useCallback(
    async (tags: string[]) => {
      const clean = tags.map((t) => t.trim()).filter(Boolean);
      if (clean.length === 0) return;
      const existing = data?.recentTags ?? [];
      const merged = [...clean, ...existing.filter((t) => !clean.includes(t))].slice(0, 50);
      // Skip the round-trip if nothing changed (avoids needless re-renders on every save).
      if (
        merged.length === existing.length &&
        merged.every((t, i) => t === existing[i])
      ) {
        return;
      }
      await update.mutateAsync({ recentTags: merged });
    },
    [data, update],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings: data, isLoading, formatDate, setDateFormat, setContactEmail, recordTags }),
    [data, isLoading, formatDate, setDateFormat, setContactEmail, recordTags],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used inside <SettingsProvider>');
  return ctx;
}
