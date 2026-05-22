import { IsString, Matches } from 'class-validator';
import { Company } from '@prisma/client';

// Wikidata QID format: "Q" followed by one or more digits. Validating shape here keeps the
// picker endpoints + linkCompany from silently 404-ing on a typo or a Wikipedia URL.
export class QidDto {
  @IsString()
  @Matches(/^Q\d+$/, { message: 'qid must be a Wikidata QID like "Q312"' })
  qid!: string;
}

// Response shape. BigInt is not JSON-serializable, so we convert revenueUsd to a string at the
// boundary — the frontend re-parses to a number for display ($X.XB formatting).
export interface CompanyResponse {
  id: string;
  domain: string | null;
  name: string;
  normalizedName: string;
  logoUrl: string | null;
  description: string | null;
  wikipediaUrl: string | null;
  wikidataQid: string | null;
  cik: string | null;
  employees: number | null;
  employeesAsOf: string | null;
  revenueUsd: string | null;
  revenueAsOf: string | null;
  foundedYear: number | null;
  hqLocation: string | null;
  industry: string | null;
  website: string | null;
  sources: Record<string, string>;
  lastEnrichedAt: string | null;
  enrichmentError: string | null;
}

export function toCompanyResponse(c: Company): CompanyResponse {
  return {
    id: c.id,
    domain: c.domain,
    name: c.name,
    normalizedName: c.normalizedName,
    logoUrl: c.logoUrl,
    description: c.description,
    wikipediaUrl: c.wikipediaUrl,
    wikidataQid: c.wikidataQid,
    cik: c.cik,
    employees: c.employees,
    employeesAsOf: c.employeesAsOf?.toISOString() ?? null,
    revenueUsd: c.revenueUsd?.toString() ?? null,
    revenueAsOf: c.revenueAsOf?.toISOString() ?? null,
    foundedYear: c.foundedYear,
    hqLocation: c.hqLocation,
    industry: c.industry,
    website: c.website,
    sources: (c.sources ?? {}) as Record<string, string>,
    lastEnrichedAt: c.lastEnrichedAt?.toISOString() ?? null,
    enrichmentError: c.enrichmentError,
  };
}
