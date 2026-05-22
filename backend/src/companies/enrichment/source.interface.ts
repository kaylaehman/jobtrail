// Fields each EnrichmentSource may contribute. Strictly a subset of Company columns —
// fields the *service* manages (id, name, normalizedName, sources, lastEnrichedAt, errors,
// timestamps) are deliberately excluded so sources cannot tamper with identity or provenance.
export interface EnrichedFields {
  logoUrl: string | null;
  description: string | null;
  wikipediaUrl: string | null;
  wikidataQid: string | null;
  cik: string | null;
  employees: number | null;
  employeesAsOf: Date | null;
  revenueUsd: bigint | null;
  revenueAsOf: Date | null;
  foundedYear: number | null;
  hqLocation: string | null;
  industry: string | null;
  website: string | null;
}

export interface EnrichmentInput {
  name: string;
  domain?: string | null;
  existing: Partial<EnrichedFields>;
}

export interface EnrichmentSource {
  // Stable identifier persisted in Company.sources, e.g. "wikipedia", "wikidata", "edgar".
  readonly name: string;
  // Returns the subset of fields this source could resolve, or null if nothing matched.
  // Throwing is fine — EnrichmentService logs and records the error per-source.
  enrich(input: EnrichmentInput): Promise<Partial<EnrichedFields> | null>;
}

// Multi-provider injection token. CompaniesModule binds an ordered array under this token;
// EnrichmentService receives them via @Inject and iterates in module-declared order.
export const ENRICHMENT_SOURCES = Symbol('ENRICHMENT_SOURCES');
