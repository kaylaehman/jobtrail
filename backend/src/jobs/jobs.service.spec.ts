import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService } from '../skills/skills.service';
import { CompaniesService } from '../companies/companies.service';

describe('JobsService', () => {
  const makePrismaMock = () => ({
    jobApplication: {
      findMany: jest.fn().mockResolvedValue([{ id: 'a', company: 'X', position: 'Y' }]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data })),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  });

  const skillsStub = {
    extract: jest.fn().mockReturnValue({ skills: { languages: ['Python'] } }),
  } as unknown as SkillsService;

  const companiesStub = {
    findOrCreateByQid: jest.fn(),
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

  it('findOne throws NotFoundException for missing record', async () => {
    const prisma = makePrismaMock();
    const svc = new JobsService(prisma as unknown as PrismaService, skillsStub, companiesStub);
    await expect(svc.findOne('missing')).rejects.toThrow(/not found/i);
  });
});
