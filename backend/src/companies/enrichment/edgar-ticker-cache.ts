import { Injectable, Logger } from '@nestjs/common';
import { EnrichmentHttp } from './enrichment-http';
import { normalizeName } from '../name-normalizer';

const TICKER_URL = 'https://www.sec.gov/files/company_tickers.json';
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

interface TickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

// In-memory normalized-name → CIK map for SEC EDGAR. ~12k entries, ~1MB JSON source.
// Lazy-loaded on first lookup; the weekly cron (step 9) will force-refresh.
//
// We deliberately drop ambiguous keys (same normalized name → different CIKs) rather than
// guessing — silently mismatching "Apple Inc." with the wrong CIK is worse than no match.
@Injectable()
export class EdgarTickerCache {
  private readonly logger = new Logger(EdgarTickerCache.name);
  private map = new Map<string, string>();
  private readyAt: Date | null = null;
  private refreshing: Promise<void> | null = null;

  constructor(private readonly http: EnrichmentHttp) {}

  async ensureReady(): Promise<void> {
    if (this.map.size > 0 && !this.isStale()) return;
    await this.refresh();
  }

  // Public so the weekly cron can force-refresh on schedule.
  async refresh(): Promise<void> {
    if (this.refreshing) {
      await this.refreshing;
      return;
    }
    this.refreshing = this.doRefresh();
    try {
      await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

  lookup(normalized: string): string | null {
    return this.map.get(normalized) ?? null;
  }

  // Exposed for fuzzy backstops and for tests/observability.
  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  size(): number {
    return this.map.size;
  }

  private async doRefresh(): Promise<void> {
    const data = await this.http.get<Record<string, TickerEntry>>(TICKER_URL);
    const next = new Map<string, string>();
    const ambiguous = new Set<string>();
    for (const entry of Object.values(data)) {
      const key = normalizeName(entry.title);
      if (!key) continue;
      const cik = String(entry.cik_str).padStart(10, '0');
      if (ambiguous.has(key)) continue;
      const existing = next.get(key);
      if (existing && existing !== cik) {
        next.delete(key);
        ambiguous.add(key);
        continue;
      }
      next.set(key, cik);
    }
    this.map = next;
    this.readyAt = new Date();
    this.logger.log(
      `EDGAR ticker cache loaded: ${next.size} unique keys (${ambiguous.size} ambiguous dropped)`,
    );
  }

  private isStale(): boolean {
    if (!this.readyAt) return true;
    return Date.now() - this.readyAt.getTime() > STALE_AFTER_MS;
  }
}
