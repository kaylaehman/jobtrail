import { CompaniesService } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnrichmentService } from './enrichment/enrichment.service';
import { WikidataClient } from './enrichment/wikidata-client';
import type { Company } from '@prisma/client';

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

const makePrismaMock = () => ({
  company: {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve(baseCompany({ id: 'new', ...data })),
    ),
    update: jest.fn().mockImplementation(({ where, data }) =>
      Promise.resolve(baseCompany({ id: where.id, ...data })),
    ),
  },
  jobApplication: { findUnique: jest.fn() },
});

const enrichmentStub = { enrich: jest.fn() } as unknown as EnrichmentService;
const wikidataStub = { search: jest.fn(), getEntity: jest.fn() } as unknown as WikidataClient;

describe('CompaniesService.findOrCreateByNameOrDomain', () => {
  it('returns existing row matched by exact domain', async () => {
    const prisma = makePrismaMock();
    const existing = baseCompany({ id: 'c-existing', domain: 'chevron.com', normalizedName: 'chevron' });
    prisma.company.findUnique.mockImplementation(({ where }) =>
      where.domain === 'chevron.com' ? Promise.resolve(existing) : Promise.resolve(null),
    );
    const svc = new CompaniesService(prisma as unknown as PrismaService, enrichmentStub, wikidataStub);
    const result = await svc.findOrCreateByNameOrDomain('Chevron Corp', 'https://chevron.com/about');
    expect(result.id).toBe('c-existing');
  });

  it('returns existing row matched by normalized name', async () => {
    const prisma = makePrismaMock();
    const existing = baseCompany({ id: 'c-existing', normalizedName: 'chevron' });
    prisma.company.findUnique.mockImplementation(({ where }) =>
      where.normalizedName === 'chevron' ? Promise.resolve(existing) : Promise.resolve(null),
    );
    const svc = new CompaniesService(prisma as unknown as PrismaService, enrichmentStub, wikidataStub);
    const result = await svc.findOrCreateByNameOrDomain('Chevron Corp.');
    expect(result.id).toBe('c-existing');
  });

  it('matches "Chevron Corp." against an existing "Chevron Corporation" via normalized key', async () => {
    const prisma = makePrismaMock();
    const existing = baseCompany({ id: 'c-existing', normalizedName: 'chevron' });
    prisma.company.findUnique.mockImplementation(({ where }) =>
      where.normalizedName === 'chevron' ? Promise.resolve(existing) : Promise.resolve(null),
    );
    const svc = new CompaniesService(prisma as unknown as PrismaService, enrichmentStub, wikidataStub);
    const result = await svc.findOrCreateByNameOrDomain('Chevron Corporation');
    expect(result.id).toBe('c-existing');
  });

  it('uses Jaro-Winkler fuzzy fallback when exact match misses', async () => {
    const prisma = makePrismaMock();
    // "Chevron Corp" normalizes to "chevron"; existing row has "chevroon" (typo) which exact-matches nothing.
    prisma.company.findMany.mockResolvedValue([
      baseCompany({ id: 'c-fuzzy', normalizedName: 'chevroon' }),
    ]);
    const svc = new CompaniesService(prisma as unknown as PrismaService, enrichmentStub, wikidataStub);
    const result = await svc.findOrCreateByNameOrDomain('Chevron');
    expect(result.id).toBe('c-fuzzy');
  });

  it('does not fuzzy-match very short normalized names', async () => {
    const prisma = makePrismaMock();
    prisma.company.findMany.mockResolvedValue([
      baseCompany({ id: 'c-other', normalizedName: 'hq' }),
    ]);
    const svc = new CompaniesService(prisma as unknown as PrismaService, enrichmentStub, wikidataStub);
    const result = await svc.findOrCreateByNameOrDomain('HP');
    // "hp" and "hq" are too short for reliable JW — should fall through to create new.
    expect(result.id).toBe('new');
  });

  it('creates fresh row when neither exact nor fuzzy matches', async () => {
    const prisma = makePrismaMock();
    const svc = new CompaniesService(prisma as unknown as PrismaService, enrichmentStub, wikidataStub);
    const result = await svc.findOrCreateByNameOrDomain('Brand New Company');
    expect(result.id).toBe('new');
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Brand New Company', normalizedName: 'brand new' }),
    });
  });

  it('backfills domain onto a name-matched existing row when import learned a new domain', async () => {
    const prisma = makePrismaMock();
    const existing = baseCompany({ id: 'c-existing', normalizedName: 'chevron', domain: null });
    prisma.company.findUnique.mockImplementation(({ where }) =>
      where.normalizedName === 'chevron' ? Promise.resolve(existing) : Promise.resolve(null),
    );
    const svc = new CompaniesService(prisma as unknown as PrismaService, enrichmentStub, wikidataStub);
    await svc.findOrCreateByNameOrDomain('Chevron', 'chevron.com');
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'c-existing' },
      data: { domain: 'chevron.com' },
    });
  });
});
