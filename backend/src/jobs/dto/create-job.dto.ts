import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JobSource, JobStatus, JobType } from '@prisma/client';

export class CreateJobDto {
  @IsString() @MinLength(1) @MaxLength(200)
  company!: string;

  @IsString() @MinLength(1) @MaxLength(200)
  position!: string;

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

  @IsOptional() @IsEnum(JobType)
  jobType?: JobType;

  @IsOptional() @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional() @IsISO8601()
  appliedAt?: string;

  @IsOptional() @IsISO8601()
  deadline?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}
