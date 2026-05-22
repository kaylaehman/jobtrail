import { IsEnum, IsOptional } from 'class-validator';
import { CompanyMatchStatus, JobType } from '@prisma/client';
import { CreateJobDto } from './create-job.dto';

// All fields optional on update — partial type without depending on @nestjs/mapped-types.
export class UpdateJobDto implements Partial<CreateJobDto> {
  company?: string;
  position?: string;
  source?: CreateJobDto['source'];
  sourceJobId?: string;
  jobUrl?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  remote?: boolean;
  description?: string;
  status?: CreateJobDto['status'];
  appliedAt?: string;
  deadline?: string;
  tags?: string[];

  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @IsOptional()
  @IsEnum(CompanyMatchStatus)
  companyMatchStatus?: CompanyMatchStatus;
}
