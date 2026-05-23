import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService } from '../skills/skills.service';
import { CompaniesService } from '../companies/companies.service';

describe('JobsService', () => {
  const makePrismaMock = () => ({
    jobApplication: {
      findMany: jest.fn().mockResolvedValue([{ id: 'a', company: 'X', position: 'Y' }]),
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({ id: where.id, company: 'X', position: 'Y' }),
      ),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data })),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    jobStatusEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    },
  });

  const skillsStub = {
    extract: jest.fn().mockReturnValue({ skills: { languages: ['Python'] } }),
  } as unknown as SkillsService;

  const companiesStub = {
    findOrCreateByQid: jest.fn(),
    findOrCreateByNameOrDomain: jest.fn().mockResolvedValue({ id: 'company-1', name: 'Acme', lastEnrichedAt: null }),
    enqueueIfStale: jest.fn(),
  } as unknown as CompaniesService;

  // skillsStub and companiesStub are defined once at describe scope, so jest.fn() call history
  // would otherwise accumulate across tests and break .toHaveBeenCalledWith assertions that
  // expect a specific call count. Reset between each test.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('list applies status filter', async () => {
    const prisma = makePrismaMock();
    const svc = new JobsService(prisma as unknown as PrismaService, skillsStub, companiesStub);
    await svc.list({ status: 'applied' as never });
    expect(prisma.jobApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'applied' }) }),
    );
  });

  it('create runs skill extraction when description provided', async () => {
    const prisma = makePrismaMock();
    const svc = new JobsService(prisma as unknown as PrismaService, skillsStub, companiesStub);
    await svc.create({
      company: 'Acme',
      position: 'Engineer',
      description: 'We use Python and React',
    });
    expect(skillsStub.extract).toHaveBeenCalledWith('We use Python and React');
    expect(prisma.jobApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          extractedSkills: { skills: { languages: ['Python'] } },
        }),
      }),
    );
  });

  it('create resolves Company and links companyId on manual entry', async () => {
    const prisma = makePrismaMock();
    const svc = new JobsService(prisma as unknown as PrismaService, skillsStub, companiesStub);
    await svc.create({ company: 'Acme', position: 'Engineer' });
    expect(companiesStub.findOrCreateByNameOrDomain).toHaveBeenCalledWith('Acme');
    expect(prisma.jobApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ companyId: 'company-1' }) }),
    );
    expect(companiesStub.enqueueIfStale).toHaveBeenCalled();
  });

  it('create logs the initial status event', async () => {
    const prisma = makePrismaMock();
    const svc = new JobsService(prisma as unknown as PrismaService, skillsStub, companiesStub);
    await svc.create({ company: 'Acme', position: 'Engineer' });
    expect(prisma.jobStatusEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromStatus: null }),
      }),
    );
  });

  it('findOne throws NotFoundException for missing record', async () => {
    const prisma = makePrismaMock();
    const svc = new JobsService(prisma as unknown as PrismaService, skillsStub, companiesStub);
    await expect(svc.findOne('missing')).rejects.toThrow(/not found/i);
  });

  describe('update — appliedAt auto-stamp on transition into applied', () => {
    const withExisting = (existing: Record<string, unknown>) => {
      const prisma = makePrismaMock();
      prisma.jobApplication.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'saved',
        appliedAt: null,
        ...existing,
      });
      const svc = new JobsService(prisma as unknown as PrismaService, skillsStub, companiesStub);
      return { prisma, svc };
    };

    it('stamps now() when transitioning saved -> applied with no prior appliedAt', async () => {
      const { prisma, svc } = withExisting({ status: 'saved', appliedAt: null });
      await svc.update('job-1', { status: 'applied' as never });
      const call = prisma.jobApplication.update.mock.calls[0][0];
      expect(call.data.appliedAt).toBeInstanceOf(Date);
    });

    it('preserves an existing appliedAt across status changes', async () => {
      const prior = new Date('2026-01-15T00:00:00Z');
      const { prisma, svc } = withExisting({ status: 'rejected', appliedAt: prior });
      await svc.update('job-1', { status: 'applied' as never });
      const call = prisma.jobApplication.update.mock.calls[0][0];
      expect(call.data.appliedAt).toBeUndefined();
    });

    it('honors an explicit dto.appliedAt over the auto-stamp', async () => {
      const { prisma, svc } = withExisting({ status: 'saved', appliedAt: null });
      const explicit = '2026-03-01T00:00:00.000Z';
      await svc.update('job-1', { status: 'applied' as never, appliedAt: explicit });
      const call = prisma.jobApplication.update.mock.calls[0][0];
      expect(call.data.appliedAt).toEqual(new Date(explicit));
    });

    it('does not stamp when status changes between non-applied states', async () => {
      const { prisma, svc } = withExisting({ status: 'saved', appliedAt: null });
      await svc.update('job-1', { status: 'rejected' as never });
      const call = prisma.jobApplication.update.mock.calls[0][0];
      expect(call.data.appliedAt).toBeUndefined();
    });
  });
});
