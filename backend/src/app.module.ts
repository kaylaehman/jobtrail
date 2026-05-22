import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';
import { RoundsModule } from './rounds/rounds.module';
import { SkillsModule } from './skills/skills.module';
import { DiscoverModule } from './discover/discover.module';
import { SettingsModule } from './settings/settings.module';
import { CompaniesModule } from './companies/companies.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Backs @Cron decorators across modules (CompanyEnrichmentCron for now).
    ScheduleModule.forRoot(),
    PrismaModule,
    JobsModule,
    RoundsModule,
    SkillsModule,
    DiscoverModule,
    SettingsModule,
    CompaniesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
