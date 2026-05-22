import { Injectable, Logger } from '@nestjs/common';
import { EnrichedFields, EnrichmentInput, EnrichmentSource } from './source.interface';
import {
  COMPANY_LIKE_QIDS,
  WikidataCandidate,
  WikidataClient,
  WikidataCompanyFacts,
} from './wikidata-client';

@Injectable()
export class WikidataSource implements EnrichmentSource {
  readonly name = 'wikidata';
  private readonly logger = new Logger(WikidataSource.name);

  constructor(private readonly wikidata: WikidataClient) {}

  async enrich(input: EnrichmentInput): Promise<Partial<EnrichedFields> | null> {
    // If an earlier source produced a QID, trust it. Saves an HTTP call and avoids
    // re-disambiguating an entity Wikipedia already resolved.
    let qid = input.existing.wikidataQid ?? null;
    if (!qid) {
      const candidates = await this.wikidata.search(input.name);
      qid = await this.pickBestCandidate(candidates);
    }
    if (!qid) {
      this.logger.log(`no wikidata candidate for "${input.name}"`);
      return null;
    }
    const facts = await this.wikidata.getCompanyFacts(qid);
    return this.toFields(qid, facts);
  }

  // Two-pass selection: keyword scan on description (cheap, no extra HTTP) first, then a
  // single P31 verification on the top candidate as a backstop when descriptions are vague.
  // The keyword list is broad enough to catch "American multinational technology corporation",
  // "British retailer", "Dutch pharmaceutical company", etc.
  private async pickBestCandidate(candidates: WikidataCandidate[]): Promise<string | null> {
    if (candidates.length === 0) return null;
    const KEYWORDS =
      /\b(company|corporation|enterprise|business|firm|manufacturer|developer|bank|publisher|retailer|chain|conglomerate|holding)\b/i;
    for (const c of candidates) {
      if (KEYWORDS.test(c.description)) return c.qid;
    }
    // Backstop: pay one HTTP call to verify the top candidate via P31 instance-of.
    const top = candidates[0];
    const entity = await this.wikidata.getEntity(top.qid);
    if (entity?.instanceOf.some((qid) => COMPANY_LIKE_QIDS.has(qid))) return top.qid;
    return null;
  }

  private toFields(qid: string, facts: WikidataCompanyFacts): Partial<EnrichedFields> {
    const out: Partial<EnrichedFields> = { wikidataQid: qid };
    if (facts.employees) out.employees = facts.employees;
    if (facts.revenueUsd) out.revenueUsd = facts.revenueUsd;
    if (facts.founded) out.foundedYear = facts.founded.getFullYear();
    if (facts.hqLabel) out.hqLocation = facts.hqLabel;
    if (facts.industryLabel) out.industry = facts.industryLabel;
    if (facts.website) out.website = facts.website;
    if (facts.logoUrl) out.logoUrl = facts.logoUrl;
    return out;
  }
}
