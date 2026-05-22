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
    expect(companiesStub.findOrCreateByNameOrDomain).toHaveBeenCalledWith('Acme', undefined);
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
});
