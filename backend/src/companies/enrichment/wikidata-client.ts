import { Injectable, Logger } from '@nestjs/common';
import { EnrichmentHttp } from './enrichment-http';

export interface WikidataCandidate {
  qid: string;
  label: string;
  description: string;
}

export interface WikidataEntity {
  qid: string;
  label: string;
  description: string;
  instanceOf: string[];
}

export interface WikidataCompanyFacts {
  employees?: number;
  revenueUsd?: bigint;
  // Raw currency QID even when not USD — lets future code surface "revenue €X (not converted)".
  revenueCurrencyQid?: string;
  founded?: Date;
  hqLabel?: string;
  industryLabel?: string;
  website?: string;
  logoUrl?: string;
}

// P31 (instance-of) QIDs treated as "this entity is a kind of company or business".
// Extend as you find real-world misses; missing one just means we fall back to keyword match.
export const COMPANY_LIKE_QIDS = new Set([
  'Q783794',    // company
  'Q4830453',   // business
  'Q6881511',   // enterprise
  'Q891723',    // public company
  'Q43229',     // organization
  'Q161726',    // multinational corporation
  'Q210167',    // video game developer
  'Q1058914',   // software company
  'Q18388277',  // technology company
  'Q4287745',   // medical organization
  'Q2401749',   // pharmaceutical company
  'Q22687',     // bank
  'Q11691',     // stock exchange
]);

const USD_QID = 'Q4917';
const SEARCH_URL = 'https://www.wikidata.org/w/api.php';
const ENTITY_URL = 'https://www.wikidata.org/wiki/Special:EntityData';
const SPARQL_URL = 'https://query.wikidata.org/sparql';

@Injectable()
export class WikidataClient {
  private readonly logger = new Logger(WikidataClient.name);
  constructor(private readonly http: EnrichmentHttp) {}

  async search(query: string, limit = 7): Promise<WikidataCandidate[]> {
    const url =
      `${SEARCH_URL}?action=wbsearchentities&search=${encodeURIComponent(query)}` +
      `&language=en&type=item&format=json&origin=*&limit=${limit}`;
    let data: WbSearchResponse;
    try {
      data = await this.http.get<WbSearchResponse>(url);
    } catch (err) {
      this.logger.warn(`wikidata search failed for "${query}": ${(err as Error).message}`);
      return [];
    }
    return (data.search ?? []).map((s) => ({
      qid: s.id,
      label: s.label ?? '',
      description: s.description ?? '',
    }));
  }

  async getEntity(qid: string): Promise<WikidataEntity | null> {
    const url = `${ENTITY_URL}/${qid}.json`;
    let data: EntityDataResponse;
    try {
      data = await this.http.get<EntityDataResponse>(url);
    } catch (err) {
      this.logger.warn(`wikidata entity ${qid} failed: ${(err as Error).message}`);
      return null;
    }
    const entity = data.entities?.[qid];
    if (!entity) return null;
    const label = entity.labels?.en?.value ?? '';
    const description = entity.descriptions?.en?.value ?? '';
    const instanceOf: string[] = [];
    for (const claim of entity.claims?.P31 ?? []) {
      const id = claim.mainsnak?.datavalue?.value?.id;
      if (id) instanceOf.push(id);
    }
    return { qid, label, description, instanceOf };
  }

  async getCompanyFacts(qid: string): Promise<WikidataCompanyFacts> {
    const url = `${SPARQL_URL}?query=${encodeURIComponent(buildSparql(qid))}&format=json`;
    let data: SparqlResponse;
    try {
      data = await this.http.get<SparqlResponse>(url, {
        headers: { Accept: 'application/sparql-results+json' },
      });
    } catch (err) {
      this.logger.warn(`wikidata SPARQL ${qid} failed: ${(err as Error).message}`);
      return {};
    }
    const row = data.results?.bindings?.[0];
    return row ? parseSparqlRow(row) : {};
  }
}

function buildSparql(qid: string): string {
  return `SELECT ?employees ?revenue ?revenueUnit ?founded ?hqLabel ?industryLabel ?websiteUrl ?logoUrl WHERE {
    OPTIONAL { wd:${qid} wdt:P1128 ?employees. }
    OPTIONAL {
      wd:${qid} p:P2139 ?revStmt.
      ?revStmt psv:P2139 ?revNode.
      ?revNode wikibase:quantityAmount ?revenue;
               wikibase:quantityUnit ?revenueUnit.
    }
    OPTIONAL { wd:${qid} wdt:P571 ?founded. }
    OPTIONAL { wd:${qid} wdt:P159 ?hq. ?hq rdfs:label ?hqLabel filter(lang(?hqLabel)="en"). }
    OPTIONAL { wd:${qid} wdt:P452 ?industry. ?industry rdfs:label ?industryLabel filter(lang(?industryLabel)="en"). }
    OPTIONAL { wd:${qid} wdt:P856 ?websiteUrl. }
    OPTIONAL { wd:${qid} wdt:P154 ?logoUrl. }
  } LIMIT 1`;
}

function parseSparqlRow(row: Record<string, { value: string }>): WikidataCompanyFacts {
  const facts: WikidataCompanyFacts = {};
  if (row.employees?.value) {
    const n = Number(row.employees.value);
    if (Number.isFinite(n) && n > 0) facts.employees = Math.round(n);
  }
  if (row.revenue?.value && row.revenueUnit?.value) {
    const amount = Number(row.revenue.value);
    if (Number.isFinite(amount) && amount > 0) {
      // revenueUnit is a full URI like "http://www.wikidata.org/entity/Q4917" — strip to bare QID.
      facts.revenueCurrencyQid = row.revenueUnit.value.replace(/^.*\/entity\//, '');
      // Per spec: never guess FX rates. Non-USD currency stays in `revenueCurrencyQid` but `revenueUsd` is left null.
      if (facts.revenueCurrencyQid === USD_QID) {
        facts.revenueUsd = BigInt(Math.round(amount));
      }
    }
  }
  if (row.founded?.value) {
    const d = new Date(row.founded.value);
    if (!Number.isNaN(d.getTime())) facts.founded = d;
  }
  if (row.hqLabel?.value) facts.hqLabel = row.hqLabel.value;
  if (row.industryLabel?.value) facts.industryLabel = row.industryLabel.value;
  if (row.websiteUrl?.value) facts.website = row.websiteUrl.value;
  if (row.logoUrl?.value) facts.logoUrl = row.logoUrl.value;
  return facts;
}

interface WbSearchResponse {
  search?: Array<{ id: string; label?: string; description?: string }>;
}

interface EntityDataResponse {
  entities?: Record<string, {
    labels?: { en?: { value?: string } };
    descriptions?: { en?: { value?: string } };
    claims?: Record<string, Array<{
      mainsnak?: { datavalue?: { value?: { id?: string } } };
    }>>;
  }>;
}

interface SparqlResponse {
  results?: { bindings?: Array<Record<string, { value: string; type: string }>> };
}
