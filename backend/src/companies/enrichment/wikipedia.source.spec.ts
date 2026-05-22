import { WikipediaSource } from './wikipedia.source';
import { EnrichmentHttp, HttpError } from './enrichment-http';

const makeHttp = (impl: (url: string) => Promise<unknown>) =>
  ({ get: jest.fn().mockImplementation(impl) }) as unknown as EnrichmentHttp;

describe('WikipediaSource', () => {
  it('returns description/logo/url for a direct standard hit', async () => {
    const http = makeHttp(async () => ({
      type: 'standard',
      title: 'Chevron',
      extract: 'Chevron is an American multinational energy corporation.',
      thumbnail: { source: 'https://upload.wikimedia.org/chevron-logo.png' },
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Chevron_Corporation' } },
    }));
    const src = new WikipediaSource(http);
    const result = await src.enrich({ name: 'Chevron', existing: {} });
    expect(result).toEqual({
      description: expect.stringContaining('Chevron'),
      logoUrl: 'https://upload.wikimedia.org/chevron-logo.png',
      wikipediaUrl: 'https://en.wikipedia.org/wiki/Chevron_Corporation',
    });
  });

  it('falls back to OpenSearch when direct lookup 404s', async () => {
    const calls: string[] = [];
    const http = {
      get: jest.fn().mockImplementation(async (url: string) => {
        calls.push(url);
        if (url.includes('/api/rest_v1/page/summary/') && !url.includes('Apple_Inc')) {
          throw new HttpError(url, 404);
        }
        if (url.includes('action=opensearch')) {
          return ['Apple', ['Apple Inc.'], ['American technology company'], ['https://en.wikipedia.org/wiki/Apple_Inc.']];
        }
        // Final summary fetch for the searched title.
        return { type: 'standard', title: 'Apple Inc.', extract: 'Apple is…' };
      }),
    } as unknown as EnrichmentHttp;
    const src = new WikipediaSource(http);
    const result = await src.enrich({ name: 'Apple', existing: {} });
    expect(result?.description).toBe('Apple is…');
    expect(calls.some((u) => u.includes('action=opensearch'))).toBe(true);
  });

  it('returns null when both direct + search yield nothing', async () => {
    const http = {
      get: jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('action=opensearch')) return ['NonexistentCo', [], [], []];
        throw new HttpError(url, 404);
      }),
    } as unknown as EnrichmentHttp;
    const src = new WikipediaSource(http);
    const result = await src.enrich({ name: 'NonexistentCo', existing: {} });
    expect(result).toBeNull();
  });
});
