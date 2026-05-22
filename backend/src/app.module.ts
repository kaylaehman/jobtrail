import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';
import { RoundsModule } from './rounds/rounds.module';
import { SkillsModule } from './skills/skills.module';
import { DiscoverModule } from './discover/discover.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    JobsModule,
    RoundsModule,
    SkillsModule,
    DiscoverModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
