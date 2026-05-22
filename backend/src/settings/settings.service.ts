import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const SINGLETON_ID = 'default';

@Injectable()
export class SettingsService {
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
