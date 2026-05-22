import { EnrichmentService } from './enrichment.service';
import { EnrichedFields, EnrichmentSource } from './source.interface';
import { PrismaService } from '../../prisma/prisma.service';
import type { Company } from '@prisma/client';

// Minimal Company stub. Tests assert merge behavior, not Prisma round-trips.
const baseCompany = (overrides: Partial<Company> = {}): Company =>
  ({
    id: 'c1',
    domain: null,
    name: 'Acme',
    normalizedName: 'acme',
    logoUrl: null,
    description: null,
    wikipediaUrl: null,
    wikidataQid: null,
    cik: null,
    employees: null,
    employeesAsOf: null,
    revenueUsd: null,
    revenueAsOf: null,
    foundedYear: null,
    hqLocation: null,
    industry: null,
    website: null,
    sources: {},
    lastEnrichedAt: null,
    enrichmentError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Company;

const stubSource = (
  name: string,
  result: Partial<EnrichedFields> | null,
): EnrichmentSource => ({
  name,
  enrich: jest.fn().mockResolvedValue(result),
});

const makePrismaMock = () => ({
  company: {
    update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...baseCompany(), ...data })),
  },
});

describe('EnrichmentService.enrich', () => {
  it('merges first-wins: later sources do not overwrite earlier non-null values', async () => {
    const sources = [
      stubSource('wikipedia', { description: 'wiki desc', wikipediaUrl: 'wiki.url' }),
      stubSource('wikidata', { description: 'wikidata desc', employees: 1000 }),
    ];
    const prisma = makePrismaMock();
    const svc = new EnrichmentService(prisma as unknown as PrismaService, sources);
    await svc.enrich(baseCompany());

    const updateCall = prisma.company.update.mock.calls[0][0];
    // wikipedia wrote description first; wikidata's attempt is ignored.
    expect(updateCall.data.description).toBe('wiki desc');
    // wikidata still gets to fill the null employees field.
    expect(updateCall.data.employees).toBe(1000);
  });

  it('records per-field provenance in the sources column', async () => {
    const sources = [
      stubSource('wikipedia', { description: 'wp', logoUrl: 'wp-logo' }),
      stubSource('wikidata', { employees: 500, foundedYear: 1879 }),
    ];
    const prisma = makePrismaMock();
    const svc = new EnrichmentService(prisma as unknown as PrismaService, sources);
    await svc.enrich(baseCompany());

    const sourcesField = prisma.company.update.mock.calls[0][0].data.sources;
    expect(sourcesField).toMatchObject({
      description: 'wikipedia',
      logoUrl: 'wikipedia',
      employees: 'wikidata',
      foundedYear: 'wikidata',
    });
  });

  it('records per-source errors without aborting the run', async () => {
    const sources: EnrichmentSource[] = [
      { name: 'wikipedia', enrich: jest.fn().mockRejectedValue(new Error('wiki down')) },
      stubSource('wikidata', { description: 'wd' }),
    ];
    const prisma = makePrismaMock();
    const svc = new EnrichmentService(prisma as unknown as PrismaService, sources);
    await svc.enrich(baseCompany());

    const data = prisma.company.update.mock.calls[0][0].data;
    expect(data.description).toBe('wd');
    expect(data.enrichmentError).toContain('wikipedia: wiki down');
  });

  it('returns null source result as no-op', async () => {
    const sources = [stubSource('wikipedia', null), stubSource('wikidata', { description: 'wd' })];
    const prisma = makePrismaMock();
    const svc = new EnrichmentService(prisma as unknown as PrismaService, sources);
    await svc.enrich(baseCompany());

    const data = prisma.company.update.mock.calls[0][0].data;
    expect(data.description).toBe('wd');
  });
});
