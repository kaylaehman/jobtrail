import { WikidataSource } from './wikidata.source';
import { WikidataClient } from './wikidata-client';

const makeClient = (overrides: Partial<jest.Mocked<WikidataClient>> = {}) =>
  ({
    search: jest.fn().mockResolvedValue([]),
    getEntity: jest.fn().mockResolvedValue(null),
    getCompanyFacts: jest.fn().mockResolvedValue({}),
    ...overrides,
  }) as unknown as WikidataClient;

describe('WikidataSource', () => {
  it('reuses existing wikidataQid without searching', async () => {
    const client = makeClient({
      getCompanyFacts: jest.fn().mockResolvedValue({
        employees: 45000,
        foundedYear: undefined,
        founded: new Date('1879-09-10'),
      }),
    } as never);
    const src = new WikidataSource(client);
    const result = await src.enrich({ name: 'Chevron', existing: { wikidataQid: 'Q319642' } });
    expect((client.search as jest.Mock)).not.toHaveBeenCalled();
    expect(client.getCompanyFacts).toHaveBeenCalledWith('Q319642');
    expect(result?.wikidataQid).toBe('Q319642');
    expect(result?.employees).toBe(45000);
    expect(result?.foundedYear).toBe(1879);
  });

  it('picks first description-matching candidate', async () => {
    const client = makeClient({
      search: jest.fn().mockResolvedValue([
        { qid: 'Q1', label: 'Apple', description: 'fruit of the apple tree' },
        { qid: 'Q312', label: 'Apple Inc.', description: 'American multinational technology corporation' },
      ]),
      getCompanyFacts: jest.fn().mockResolvedValue({}),
    } as never);
    const src = new WikidataSource(client);
    const result = await src.enrich({ name: 'Apple', existing: {} });
    expect(client.getCompanyFacts).toHaveBeenCalledWith('Q312');
    expect(result?.wikidataQid).toBe('Q312');
  });

  it('falls back to P31 verification when no description matches', async () => {
    const client = makeClient({
      search: jest.fn().mockResolvedValue([
        { qid: 'Q999', label: 'Acme', description: 'fictional brand' },
      ]),
      getEntity: jest.fn().mockResolvedValue({
        qid: 'Q999',
        label: 'Acme',
        description: 'fictional brand',
        instanceOf: ['Q783794'], // company
      }),
      getCompanyFacts: jest.fn().mockResolvedValue({}),
    } as never);
    const src = new WikidataSource(client);
    const result = await src.enrich({ name: 'Acme', existing: {} });
    expect(client.getEntity).toHaveBeenCalledWith('Q999');
    expect(result?.wikidataQid).toBe('Q999');
  });

  it('returns null when neither pass identifies a company-like candidate', async () => {
    const client = makeClient({
      search: jest.fn().mockResolvedValue([{ qid: 'Q1', label: 'X', description: 'novel' }]),
      getEntity: jest.fn().mockResolvedValue({
        qid: 'Q1',
        label: 'X',
        description: 'novel',
        instanceOf: ['Q571'], // book
      }),
    } as never);
    const src = new WikidataSource(client);
    const result = await src.enrich({ name: 'X', existing: {} });
    expect(result).toBeNull();
  });
});
