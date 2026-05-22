import { Inject, Injectable, Logger } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EnrichedFields,
  EnrichmentInput,
  EnrichmentSource,
  ENRICHMENT_SOURCES,
} from './source.interface';

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENRICHMENT_SOURCES) private readonly sources: EnrichmentSource[],
  ) {}

  // Runs each source in module-declared order, merges per `mergeFields`, persists. Per-source
  // failures are recorded in enrichmentError but never abort the run — a flaky Wikidata day
  // should not prevent EDGAR data from landing.
  async enrich(company: Company): Promise<Company> {
    let merged: Partial<EnrichedFields> = this.toFields(company);
    const provenance: Record<string, string> = { ...(company.sources as Record<string, string> ?? {}) };
    const errors: string[] = [];

    for (const source of this.sources) {
      const input: EnrichmentInput = {
        name: company.name,
        domain: company.domain,
        existing: merged,
      };
      try {
        const result = await source.enrich(input);
        if (!result) continue;
        const { next, contributed } = this.mergeFields(merged, result, source.name);
        merged = next;
        for (const field of contributed) provenance[field] = source.name;
      } catch (err) {
        const msg = `${source.name}: ${(err as Error).message}`;
        this.logger.warn(`enrichment source failed — ${msg}`);
        errors.push(msg);
      }
    }

    return this.prisma.company.update({
      where: { id: company.id },
      data: {
        ...this.toPrismaUpdate(merged),
        sources: provenance as unknown as Prisma.InputJsonValue,
        lastEnrichedAt: new Date(),
        enrichmentError: errors.length ? errors.join('; ') : null,
      },
    });
  }

  // TODO(user): implement merge precedence. See conversation for trade-offs.
  //
  // Inputs:
  //   current      — the accumulated EnrichedFields so far (earlier sources already merged)
  //   incoming     — fields the current source just produced
  //   sourceName   — the source's `.name` ("wikipedia" | "wikidata" | "edgar")
  //
  // Return:
  //   next         — the merged fields object
  //   contributed  — keys whose value came from THIS source (used for provenance)
  //
  // Constraints:
  //   - Never set a field back to null if it already had a value.
  //   - Track per-field contribution accurately — `sources` powers the "data via X" UI footer.
  //
  // Pure first-wins placeholder so the file compiles. Replace with the real rule.
  private mergeFields(
    current: Partial<EnrichedFields>,
    incoming: Partial<EnrichedFields>,
    _sourceName: string,
  ): { next: Partial<EnrichedFields>; contributed: Array<keyof EnrichedFields> } {
    const next = { ...current };
    const contributed: Array<keyof EnrichedFields> = [];
    for (const key of Object.keys(incoming) as Array<keyof EnrichedFields>) {
      const value = incoming[key];
      if (value == null) continue;
      if (current[key] == null) {
        (next as Record<string, unknown>)[key] = value;
        contributed.push(key);
      }
    }
    return { next, contributed };
  }

  private toFields(c: Company): Partial<EnrichedFields> {
    return {
      logoUrl: c.logoUrl,
      description: c.description,
      wikipediaUrl: c.wikipediaUrl,
      wikidataQid: c.wikidataQid,
      cik: c.cik,
      employees: c.employees,
      employeesAsOf: c.employeesAsOf,
      revenueUsd: c.revenueUsd,
      revenueAsOf: c.revenueAsOf,
      foundedYear: c.foundedYear,
      hqLocation: c.hqLocation,
      industry: c.industry,
      website: c.website,
    };
  }

  private toPrismaUpdate(fields: Partial<EnrichedFields>): Prisma.CompanyUpdateInput {
    // Strip undefined so we don't accidentally write nulls over existing values.
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) out[k] = v;
    }
    return out as Prisma.CompanyUpdateInput;
  }
}
