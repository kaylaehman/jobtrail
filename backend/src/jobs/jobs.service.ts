import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService } from '../skills/skills.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobDto } from './dto/query-job.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skills: SkillsService,
    private readonly companies: CompaniesService,
  ) {}

  async list(q: QueryJobDto) {
    const where: Prisma.JobApplicationWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.company) where.company = { contains: q.company, mode: 'insensitive' };
    if (q.tag) where.tags = { has: q.tag };
    if (q.q) {
      where.OR = [
        { company: { contains: q.q, mode: 'insensitive' } },
        { position: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    return this.prisma.jobApplication.findMany({
      where,
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async create(dto: CreateJobDto) {
    const data = this.toPrismaData(dto);
    if (dto.description) {
      data.extractedSkills = this.skills.extract(dto.description) as unknown as Prisma.InputJsonValue;
    }
    return this.prisma.jobApplication.create({ data, include: { rounds: true } });
  }

  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id);
    const data = this.toPrismaData(dto);
    if (dto.description !== undefined) {
      data.extractedSkills = dto.description
        ? (this.skills.extract(dto.description) as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull;
    }
    // Rejecting the auto-matched company means the existing companyId is wrong — drop the link
    // so the UI doesn't keep rendering the wrong logo/description. `auto` and `confirmed` both
    // imply the current companyId is intended, so leave it alone.
    if (dto.companyMatchStatus === 'rejected') {
      data.companyId = null;
    }
    return this.prisma.jobApplication.update({
      where: { id },
      data,
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.jobApplication.delete({ where: { id } });
    return { deleted: true };
  }

  // Manual disambiguation: the user picked a specific Wikidata entity from the picker UI.
  // Resolves the QID to a Company (creating one if needed), links the application, and
  // marks the match `confirmed` so future imports + the UI know it's been verified.
  async linkCompany(id: string, qid: string) {
    await this.findOne(id);
    const company = await this.companies.findOrCreateByQid(qid);
    return this.prisma.jobApplication.update({
      where: { id },
      data: { companyId: company.id, companyMatchStatus: 'confirmed' },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });
  }

  // Used by the Discover flow when importing JobSpy results — upsert on (source, sourceJobId).
  async upsertFromSource(dto: CreateJobDto) {
    if (!dto.source || dto.source === 'manual' || !dto.sourceJobId) {
      return this.create(dto);
    }
    const data = this.toPrismaData(dto);
    if (dto.description) {
      data.extractedSkills = this.skills.extract(dto.description) as unknown as Prisma.InputJsonValue;
    }
    return this.prisma.jobApplication.upsert({
      where: {
        source_sourceJobId_unique: {
          source: dto.source,
          sourceJobId: dto.sourceJobId,
        },
      },
      create: data,
      update: {
        // Re-imports refresh URL/salary/location/description but never overwrite a user's status/notes.
        company: data.company,
        position: data.position,
        jobUrl: data.jobUrl,
        location: data.location,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency,
        remote: data.remote,
        description: data.description,
        extractedSkills: data.extractedSkills,
      },
      include: { rounds: true },
    });
  }

  private toPrismaData(
    dto: CreateJobDto | UpdateJobDto,
  ): Prisma.JobApplicationUncheckedCreateInput & Prisma.JobApplicationUncheckedUpdateInput {
    const data: Record<string, unknown> = { ...dto };
    if (dto.appliedAt) data.appliedAt = new Date(dto.appliedAt);
    if (dto.deadline) data.deadline = new Date(dto.deadline);
    return data as Prisma.JobApplicationUncheckedCreateInput &
      Prisma.JobApplicationUncheckedUpdateInput;
  }
}
