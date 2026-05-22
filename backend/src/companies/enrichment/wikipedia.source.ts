import { Injectable, Logger } from '@nestjs/common';
import { EnrichedFields, EnrichmentInput, EnrichmentSource } from './source.interface';
import { EnrichmentHttp, HttpError } from './enrichment-http';

interface WikipediaSummary {
  type: string;                    // "standard" | "disambiguation" | "no-extract" | ...
  title: string;
  extract?: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
}

interface OpenSearchResult {
  // OpenSearch returns [query, titles[], descriptions[], urls[]]
  0: string;
  1: string[];
  2: string[];
  3: string[];
}

const SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const OPENSEARCH = 'https://en.wikipedia.org/w/api.php';

@Injectable()
export class WikipediaSource implements EnrichmentSource {
  readonly name = 'wikipedia';
  private readonly logger = new Logger(WikipediaSource.name);

  constructor(private readonly http: EnrichmentHttp) {}

  async enrich(input: EnrichmentInput): Promise<Partial<EnrichedFields> | null> {
    // Try the direct title lookup first — fastest path when the company name maps cleanly.
    const direct = await this.fetchSummary(input.name);
    if (direct && direct.type === 'standard') {
      return this.toFields(direct);
    }
    // Disambiguation or 404 → fall back to OpenSearch and take the first hit whose summary is standard.
    const searched = await this.searchAndFetch(input.name);
    return searched ? this.toFields(searched) : null;
  }

  private async fetchSummary(title: string): Promise<WikipediaSummary | null> {
    const url = SUMMARY_BASE + encodeURIComponent(title.replace(/ /g, '_'));
    try {
      return await this.http.get<WikipediaSummary>(url);
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return null;
      this.logger.warn(`wikipedia summary failed for "${title}": ${(err as Error).message}`);
      return null;
    }
  }

  private async searchAndFetch(query: string): Promise<WikipediaSummary | null> {
    const url =
      `${OPENSEARCH}?action=opensearch&limit=5&namespace=0&format=json&search=` +
      encodeURIComponent(query);
    let results: OpenSearchResult | null = null;
    try {
      results = await this.http.get<OpenSearchResult>(url);
    } catch (err) {
      this.logger.warn(`wikipedia search failed for "${query}": ${(err as Error).message}`);
      return null;
    }
    const titles = results?.[1] ?? [];
    for (const title of titles) {
      const summary = await this.fetchSummary(title);
      if (summary && summary.type === 'standard') return summary;
    }
    return null;
  }

  private toFields(s: WikipediaSummary): Partial<EnrichedFields> {
    const out: Partial<EnrichedFields> = {};
    if (s.extract) out.description = s.extract;
    if (s.thumbnail?.source) out.logoUrl = s.thumbnail.source;
    const page = s.content_urls?.desktop?.page;
    if (page) out.wikipediaUrl = page;
    return out;
  }
}
