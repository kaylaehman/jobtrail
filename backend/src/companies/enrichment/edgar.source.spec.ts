import { EdgarSource } from './edgar.source';
import { EdgarTickerCache } from './edgar-ticker-cache';
import { EnrichmentHttp } from './enrichment-http';

const makeHttp = (responses: Record<string, unknown>) =>
  ({
    get: jest.fn().mockImplementation(async (url: string) => {
      for (const [pattern, body] of Object.entries(responses)) {
        if (url.includes(pattern)) return body;
      }
      throw new Error(`unstubbed URL: ${url}`);
    }),
  }) as unknown as EnrichmentHttp;

const makeTickerCache = (lookup: (key: string) => string | null) =>
  ({
    ensureReady: jest.fn().mockResolvedValue(undefined),
    lookup: jest.fn().mockImplementation(lookup),
    keys: jest.fn().mockReturnValue([].values()),
    size: jest.fn().mockReturnValue(0),
  }) as unknown as EdgarTickerCache;

describe('EdgarSource', () => {
  it('returns null when the ticker lookup misses', async () => {
    const cache = makeTickerCache(() => null);
    const http = makeHttp({});
    const src = new EdgarSource(http, cache);
    const result = await src.enrich({ name: 'PrivateCo', existing: {} });
    expect(result).toBeNull();
  });

  it('pulls latest 10-K revenue and ignores 10-Q values', async () => {
    const cache = makeTickerCache((key) => (key === 'chevron' ? '0000093410' : null));
    const http = makeHttp({
      '/submissions/CIK0000093410.json': {
        cik: '93410',
        name: 'Chevron Corporation',
        sicDescription: 'Petroleum Refining',
        addresses: {
          business: { city: 'San Ramon', stateOrCountry: 'CA', stateOrCountryDescription: 'CALIFORNIA' },
        },
      },
      '/api/xbrl/companyfacts/CIK0000093410.json': {
        facts: {
          'us-gaap': {
            Revenues: {
              units: {
                USD: [
                  { end: '2023-09-30', val: 50_000_000_000, form: '10-Q' },
                  { end: '2023-12-31', val: 200_000_000_000, form: '10-K' },
                  { end: '2022-12-31', val: 180_000_000_000, form: '10-K' },
                ],
              },
            },
          },
          dei: {
            EntityNumberOfEmployees: {
              units: {
                pure: [
                  { end: '2023-12-31', val: 45600, form: '10-K' },
                  { end: '2022-12-31', val: 43846, form: '10-K' },
                ],
              },
            },
          },
        },
      },
    });
    const src = new EdgarSource(http, cache);
    const result = await src.enrich({ name: 'Chevron', existing: {} });
    expect(result?.cik).toBe('0000093410');
    expect(result?.revenueUsd).toBe(BigInt(200_000_000_000));
    expect(result?.revenueAsOf?.toISOString()).toMatch(/^2023-12-31/);
    expect(result?.employees).toBe(45600);
    expect(result?.industry).toBe('Petroleum Refining');
    expect(result?.hqLocation).toBe('San Ramon, CALIFORNIA');
  });

  it('falls through revenue concepts in priority order', async () => {
    const cache = makeTickerCache(() => '0001234567');
    const http = makeHttp({
      '/submissions/': { cik: '1234567' },
      '/companyfacts/': {
        facts: {
          'us-gaap': {
            // Newer concept absent; older one present.
            SalesRevenueNet: {
              units: { USD: [{ end: '2018-12-31', val: 5_000_000_000, form: '10-K' }] },
            },
          },
        },
      },
    });
    const src = new EdgarSource(http, cache);
    const result = await src.enrich({ name: 'Acme', existing: {} });
    expect(result?.revenueUsd).toBe(BigInt(5_000_000_000));
  });

  it('skips revenue when no 10-K exists', async () => {
    const cache = makeTickerCache(() => '0001234567');
    const http = makeHttp({
      '/submissions/': { cik: '1234567' },
      '/companyfacts/': {
        facts: {
          'us-gaap': {
            Revenues: {
              units: { USD: [{ end: '2023-09-30', val: 1_000_000_000, form: '10-Q' }] },
            },
          },
        },
      },
    });
    const src = new EdgarSource(http, cache);
    const result = await src.enrich({ name: 'NewlyPublic', existing: {} });
    expect(result?.revenueUsd).toBeUndefined();
  });
});
