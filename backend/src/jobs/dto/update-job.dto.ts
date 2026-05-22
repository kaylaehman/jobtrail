import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CompanyMatchStatus, JobSource, JobStatus, JobType } from '@prisma/client';
import { CreateJobDto } from './create-job.dto';

// All fields optional on update — partial type without depending on @nestjs/mapped-types.
//
// IMPORTANT: every field MUST have at least one class-validator decorator. The global
// ValidationPipe runs with `whitelist: true` (see main.ts) which strips any field that has
// no decorator from the request body BEFORE the controller sees it. Bare `field?: type;`
// declarations look fine at compile time but silently disappear at runtime — that's the
// exact bug that made the dashboard status select appear to do nothing.
export class UpdateJobDto implements Partial<CreateJobDto> {
  @IsOptional() @IsString()
  company?: string;

  @IsOptional() @IsString()
  position?: string;

  @IsOptional() @IsEnum(JobSource)
  source?: JobSource;

  @IsOptional() @IsString()
  sourceJobId?: string;

  @IsOptional() @IsString()
  jobUrl?: string;

  @IsOptional() @IsString()
  location?: string;

  @IsOptional() @IsInt()
  salaryMin?: number;

  @IsOptional() @IsInt()
  salaryMax?: number;

  @IsOptional() @IsString()
  salaryCurrency?: string;

  @IsOptional() @IsBoolean()
  remote?: boolean;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional() @IsISO8601()
  appliedAt?: string;

  @IsOptional() @IsISO8601()
  deadline?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  // SkillChips edits write the full extracted-skills tree back via the update path; we accept
  // anything object-shaped here and let the Prisma Json column hold it.
  @IsOptional() @IsObject()
  extractedSkills?: unknown;

  @IsOptional() @IsEnum(JobType)
  jobType?: JobType;

  @IsOptional() @IsEnum(CompanyMatchStatus)
  companyMatchStatus?: CompanyMatchStatus;
}
