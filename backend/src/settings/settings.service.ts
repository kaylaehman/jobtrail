import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ResetSettingsDto } from './dto/reset-settings.dto';

const SINGLETON_ID = 'default';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    return this.prisma.userSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
  }

  async update(dto: UpdateSettingsDto) {
    return this.prisma.userSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...dto },
      update: dto,
    });
  }

  // Wipe all application data so the user can start a fresh job search. user_settings is
  // intentionally preserved — date format / recent tags are preferences, not application data.
  // enrichment_cache is opt-in: keeping it makes the next enrichment run fast on the same companies.
  //
  // Delete order respects FK constraints (events/rounds before applications; applications before
  // companies). The Prisma transaction is for atomicity, not performance.
  async reset(dto: ResetSettingsDto) {
    const result = await this.prisma.$transaction([
      this.prisma.jobStatusEvent.deleteMany(),
      this.prisma.interviewRound.deleteMany(),
      this.prisma.jobApplication.deleteMany(),
      this.prisma.company.deleteMany(),
    ]);
    let enrichmentCacheCleared = 0;
    if (dto.wipeEnrichmentCache) {
      const cache = await this.prisma.enrichmentCache.deleteMany();
      enrichmentCacheCleared = cache.count;
    }
    const summary = {
      jobStatusEvents: result[0].count,
      interviewRounds: result[1].count,
      jobApplications: result[2].count,
      companies: result[3].count,
      enrichmentCacheCleared,
    };
    this.logger.warn(`Reset wiped: ${JSON.stringify(summary)}`);
    return { deleted: summary };
  }

  // Push a freshly-used tag to the front of recentTags, dedupe, cap at 50.
  async pushRecentTags(newTags: string[]) {
    if (newTags.length === 0) return this.get();
    const current = await this.get();
    const merged = [
      ...newTags,
      ...current.recentTags.filter((t) => !newTags.includes(t)),
    ].slice(0, 50);
    return this.update({ recentTags: merged });
  }
}
