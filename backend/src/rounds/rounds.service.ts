import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';

@Injectable()
export class RoundsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForJob(jobId: string) {
    return this.prisma.interviewRound.findMany({
      where: { jobApplicationId: jobId },
      orderBy: { roundNumber: 'asc' },
    });
  }

  async create(jobId: string, dto: CreateRoundDto) {
    const job = await this.prisma.jobApplication.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const roundNumber = dto.roundNumber ?? (await this.nextRoundNumber(jobId));
    return this.prisma.interviewRound.create({
      data: {
        jobApplicationId: jobId,
        roundNumber,
        type: dto.type,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        durationMinutes: dto.durationMinutes,
        interviewer: dto.interviewer,
        status: dto.status,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateRoundDto) {
    const existing = await this.prisma.interviewRound.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Round ${id} not found`);
    return this.prisma.interviewRound.update({
      where: { id },
      data: {
        roundNumber: dto.roundNumber,
        type: dto.type,
        scheduledAt:
          dto.scheduledAt === undefined ? undefined : dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        durationMinutes: dto.durationMinutes,
        interviewer: dto.interviewer,
        status: dto.status,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.interviewRound.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Round ${id} not found`);
    await this.prisma.interviewRound.delete({ where: { id } });
    return { deleted: true };
  }

  private async nextRoundNumber(jobId: string): Promise<number> {
    const last = await this.prisma.interviewRound.findFirst({
      where: { jobApplicationId: jobId },
      orderBy: { roundNumber: 'desc' },
      select: { roundNumber: true },
    });
    return (last?.roundNumber ?? 0) + 1;
  }
}
