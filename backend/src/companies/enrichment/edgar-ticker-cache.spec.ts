import { EdgarTickerCache } from './edgar-ticker-cache';
import { EnrichmentHttp } from './enrichment-http';

const makeHttp = (data: Record<string, { cik_str: number; ticker: string; title: string }>) =>
  ({ get: jest.fn().mockResolvedValue(data) }) as unknown as EnrichmentHttp;

describe('EdgarTickerCache', () => {
  it('builds a normalized-name → CIK map from the SEC ticker JSON', async () => {
    const http = makeHttp({
      '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
      '1': { cik_str: 93410, ticker: 'CVX', title: 'Chevron Corporation' },
      '2': { cik_str: 789019, ticker: 'MSFT', title: 'Microsoft Corp' },
    });
    const cache = new EdgarTickerCache(http);
    await cache.refresh();
    expect(cache.lookup('apple')).toBe('0000320193');
    expect(cache.lookup('chevron')).toBe('0000093410');
    expect(cache.lookup('microsoft')).toBe('0000789019');
  });

  it('zero-pads CIKs to 10 digits', async () => {
    const http = makeHttp({ '0': { cik_str: 123, ticker: 'X', title: 'Tiny Co' } });
    const cache = new EdgarTickerCache(http);
    await cache.refresh();
    expect(cache.lookup('tiny')).toBe('0000000123');
  });

  it('drops ambiguous keys rather than guessing', async () => {
    const http = makeHttp({
      '0': { cik_str: 111, ticker: 'A1', title: 'Acme Inc.' },
      '1': { cik_str: 222, ticker: 'A2', title: 'Acme Corporation' },
    });
    const cache = new EdgarTickerCache(http);
    await cache.refresh();
    // Both normalize to "acme" → must be dropped. Silently mismatching would attach
    // the wrong CIK and pollute revenue/employees with another company's data.
    expect(cache.lookup('acme')).toBeNull();
  });

  it('ensureReady only fetches once until stale', async () => {
    const http = makeHttp({ '0': { cik_str: 1, ticker: 'X', title: 'X Co' } });
    const cache = new EdgarTickerCache(http);
    await cache.ensureReady();
    await cache.ensureReady();
    await cache.ensureReady();
    expect((http.get as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent refreshes into a single fetch', async () => {
    const http = makeHttp({ '0': { cik_str: 1, ticker: 'X', title: 'X Co' } });
    const cache = new EdgarTickerCache(http);
    await Promise.all([cache.refresh(), cache.refresh(), cache.refresh()]);
    expect((http.get as jest.Mock)).toHaveBeenCalledTimes(1);
  });
});
