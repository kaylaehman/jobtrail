import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { SkillsModule } from '../skills/skills.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  // CompaniesModule is imported so JobsService can call CompaniesService.findOrCreateByQid
  // from the linkCompany flow. CompaniesModule doesn't depend on JobsModule, so no cycle.
  imports: [SkillsModule, CompaniesModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
