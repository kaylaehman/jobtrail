import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService } from '../skills/skills.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobDto } from './dto/query-job.dto';

// Detail-page `include` shared by every method that returns a full application.
// statusEvents + notes come back newest-first so timelines don't need to reverse client-side.
const JOB_DETAIL_INCLUDE = {
  rounds: { orderBy: { roundNumber: 'asc' } },
  statusEvents: { orderBy: { createdAt: 'desc' } },
  notes: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.JobApplicationInclude;

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
    if (q.companyId) where.companyId = q.companyId;
    if (q.jobType) where.jobType = q.jobType;
    if (q.industry) {
      const terms = q.industry.split(',').map((s) => s.trim()).filter(Boolean);
      if (terms.length === 1) {
        where.companyEntity = {
          is: { industry: { contains: terms[0], mode: 'insensitive' } },
        };
      } else if (terms.length > 1) {
        where.companyEntity = {
          is: {
            OR: terms.map((t) => ({ industry: { contains: t, mode: 'insensitive' } })),
          },
        };
      }
    }
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
      include: JOB_DETAIL_INCLUDE,
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async create(dto: CreateJobDto) {
    const data = this.toPrismaData(dto);
    if (dto.description) {
      data.extractedSkills = this.skills.extract(dto.description) as unknown as Prisma.InputJsonValue;
    }
    // Auto-link the manually-added application to a Company row — mirrors what
    // DiscoverService.import does for JobSpy imports. Without this, manually-added
    // apps stayed companyId=null forever, so the Dashboard table never linked their
    // company name and JobDetail's CompanyPanel never rendered anything for them.
    if (dto.company) {
      // Manual create doesn't carry a domain hint — resolution falls back to normalized-name dedup.
      // The discover flow still passes companyUrl through DiscoverImportDto for the JobSpy path.
      const company = await this.companies.findOrCreateByNameOrDomain(dto.company);
      data.companyId = company.id;
      this.companies.enqueueIfStale(company);
    }
    const created = await this.prisma.jobApplication.create({ data });
    // Initial timeline marker. fromStatus null = "row was born with this status".
    await this.prisma.jobStatusEvent.create({
      data: { jobApplicationId: created.id, fromStatus: null, toStatus: created.status },
    });
    // findUniqueOrThrow (not findUnique) — the row was created two statements above so
    // null isn't possible at runtime. Using the non-nullable variant lets the return type
    // propagate as JobApplication through upsertFromSource into DiscoverService.import,
    // where downstream code reads app.companyMatchStatus / app.companyId without TS18047.
    return this.prisma.jobApplication.findUniqueOrThrow({
      where: { id: created.id },
      include: JOB_DETAIL_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateJobDto) {
    const existing = await this.findOne(id);
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
    // Log status transition. Two writes intentionally not wrapped in a transaction — for a
    // single-user local app the consistency window is microseconds, and a stray event row with
    // no matching update is harmless (timeline just shows an attempted transition).
    if (dto.status && dto.status !== existing.status) {
      await this.prisma.jobStatusEvent.create({
        data: { jobApplicationId: id, fromStatus: existing.status, toStatus: dto.status },
      });
    }
    return this.prisma.jobApplication.update({
      where: { id },
      data,
      include: JOB_DETAIL_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.jobApplication.delete({ where: { id } });
    return { deleted: true };
  }

  async createNote(jobId: string, body: string) {
    await this.findOne(jobId);
    return this.prisma.jobNote.create({ data: { jobApplicationId: jobId, body } });
  }

  async deleteNote(jobId: string, noteId: string) {
    // Scope the delete to (jobId, noteId) so a request can't nuke a note across applications.
    const result = await this.prisma.jobNote.deleteMany({
      where: { id: noteId, jobApplicationId: jobId },
    });
    return { deleted: result.count };
  }

  // Merged feed of status transitions + user notes across every application, newest first.
  // Denormalizes job company/position onto each item so the UI can render contextually
  // without an N+1 of job lookups. Capped at 500 items to keep payloads sane; pagination
  // can come later if the feed actually grows that big.
  async getActivity() {
    const select = {
      id: true,
      jobApplicationId: true,
      createdAt: true,
      jobApplication: { select: { id: true, company: true, position: true } },
    } as const;
    const [events, notes] = await Promise.all([
      this.prisma.jobStatusEvent.findMany({
        select: { ...select, fromStatus: true, toStatus: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.jobNote.findMany({
        select: { ...select, body: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);
    type Item =
      | {
          type: 'status'; id: string; jobApplicationId: string; jobCompany: string;
          jobPosition: string; fromStatus: string | null; toStatus: string; createdAt: string;
        }
      | {
          type: 'note'; id: string; jobApplicationId: string; jobCompany: string;
          jobPosition: string; body: string; createdAt: string;
        };
    const items: Item[] = [
      ...events.map((e) => ({
        type: 'status' as const,
        id: e.id,
        jobApplicationId: e.jobApplicationId,
        jobCompany: e.jobApplication.company,
        jobPosition: e.jobApplication.position,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        createdAt: e.createdAt.toISOString(),
      })),
      ...notes.map((n) => ({
        type: 'note' as const,
        id: n.id,
        jobApplicationId: n.jobApplicationId,
        jobCompany: n.jobApplication.company,
        jobPosition: n.jobApplication.position,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      })),
    ];
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items.slice(0, 500);
  }

  // Used by DiscoverService.import after CompaniesService resolves a row for the imported
  // job. Doesn't touch companyMatchStatus — that's the caller's job (auto stays auto).
  async setCompanyId(id: string, companyId: string | null) {
    return this.prisma.jobApplication.update({
      where: { id },
      data: { companyId },
      include: JOB_DETAIL_INCLUDE,
    });
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
      include: JOB_DETAIL_INCLUDE,
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
