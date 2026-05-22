import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Company } from '@prisma/client';
import { JaroWinklerDistance } from 'natural';
import { PrismaService } from '../prisma/prisma.service';
import { EnrichmentService } from './enrichment/enrichment.service';
import { WikidataCandidate, WikidataClient } from './enrichment/wikidata-client';
import { normalizeName } from './name-normalizer';

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
// Jaro-Winkler similarity threshold for the fuzzy-match fallback. 0.92 keeps "Chevron Corporation"
// and "Chevron Corp" together (score ~0.97) while keeping "Apple" and "Apple Records" apart (~0.91).
const FUZZY_MATCH_THRESHOLD = 0.92;
// JW is unreliable on very short strings — "HP" vs "HQ" scores too high. Require ≥4 chars.
const FUZZY_MIN_LENGTH = 4;

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrichment: EnrichmentService,
    private readonly wikidata: WikidataClient,
  ) {}

  async findOne(id: string): Promise<Company> {
    const c = await this.prisma.company.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Company ${id} not found`);
    return c;
  }

  async findByApplication(applicationId: string): Promise<Company | null> {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { companyEntity: true },
    });
    if (!app) throw new NotFoundException(`Application ${applicationId} not found`);
    return app.companyEntity;
  }

  // Called from the import flow. Dedupes by domain (when present) then by normalized name,
  // creates a fresh row if neither matches, and returns the row. Does not enrich here —
  // enrichment is scheduled by the caller via `enqueueIfStale`.
  async findOrCreateByNameOrDomain(name: string, domain?: string | null): Promise<Company> {
    const cleanDomain = domain ? domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null;
    if (cleanDomain) {
      const byDomain = await this.prisma.company.findUnique({ where: { domain: cleanDomain } });
      if (byDomain) return byDomain;
    }
    const normalizedName = normalizeName(name);
    const byName = await this.prisma.company.findUnique({ where: { normalizedName } });
    if (byName) {
      // Backfill domain on the existing row if we learned it on this import.
      if (cleanDomain && !byName.domain) {
        return this.prisma.company.update({
          where: { id: byName.id },
          data: { domain: cleanDomain },
        });
      }
      return byName;
    }
    // Fuzzy fallback — catches near-misses normalizeName can't (typos, spelling variants,
    // suffixes we did not list). Production dedup pattern: exact key + fuzzy backstop.
    const fuzzy = await this.findFuzzyMatch(normalizedName);
    if (fuzzy) {
      if (cleanDomain && !fuzzy.domain) {
        return this.prisma.company.update({ where: { id: fuzzy.id }, data: { domain: cleanDomain } });
      }
      return fuzzy;
    }
    return this.prisma.company.create({
      data: { name, normalizedName, domain: cleanDomain },
    });
  }

  // Jaro-Winkler scan across all existing companies. At <200 rows this is trivially fast;
  // if the table grows past a few thousand, swap to a trigram index in Postgres.
  private async findFuzzyMatch(normalizedName: string): Promise<Company | null> {
    if (normalizedName.length < FUZZY_MIN_LENGTH) return null;
    const candidates = await this.prisma.company.findMany();
    let best: { company: Company; score: number } | null = null;
    for (const c of candidates) {
      if (c.normalizedName.length < FUZZY_MIN_LENGTH) continue;
      const score = JaroWinklerDistance(normalizedName, c.normalizedName);
      if (!best || score > best.score) best = { company: c, score };
    }
    if (best && best.score >= FUZZY_MATCH_THRESHOLD) {
      this.logger.log(
        `fuzzy match: "${normalizedName}" ≈ "${best.company.normalizedName}" (${best.score.toFixed(3)})`,
      );
      return best.company;
    }
    return null;
  }

  // Fire-and-forget. The caller (e.g. DiscoverService.import) returns the import response
  // immediately; enrichment runs in the background. Errors are logged, not thrown.
  enqueueIfStale(company: Company): void {
    const isStale =
      !company.lastEnrichedAt ||
      Date.now() - company.lastEnrichedAt.getTime() > STALE_AFTER_MS;
    if (!isStale) return;
    setImmediate(() => {
      this.enrichment.enrich(company).catch((err) => {
        this.logger.error(`enrichment failed for company ${company.id}: ${err.message}`);
      });
    });
  }

  async refresh(id: string): Promise<Company> {
    const company = await this.findOne(id);
    return this.enrichment.enrich(company);
  }

  // Used by the disambiguation picker UI. Min 2 chars — shorter queries waste an upstream call
  // and return mostly garbage anyway.
  async searchWikidata(query: string): Promise<WikidataCandidate[]> {
    if (!query || query.trim().length < 2) return [];
    return this.wikidata.search(query.trim());
  }

  // Resolves a Wikidata QID to a Company row. If a row already references this QID, return it.
  // If a row with the same normalized name exists (e.g., auto-import already created a stub),
  // backfill the QID rather than duplicating. Otherwise create fresh seeded with the QID's label.
  async findOrCreateByQid(qid: string): Promise<Company> {
    const existingByQid = await this.prisma.company.findFirst({ where: { wikidataQid: qid } });
    if (existingByQid) return existingByQid;

    const entity = await this.wikidata.getEntity(qid);
    if (!entity || !entity.label) {
      throw new BadRequestException(`Wikidata entity ${qid} not found or has no English label`);
    }
    const normalizedName = normalizeName(entity.label);
    const byName = await this.prisma.company.findUnique({ where: { normalizedName } });
    if (byName) {
      return this.prisma.company.update({
        where: { id: byName.id },
        data: { wikidataQid: qid },
      });
    }
    return this.prisma.company.create({
      data: { name: entity.label, normalizedName, wikidataQid: qid },
    });
  }


}
