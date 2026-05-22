import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '@prisma/client';

// Query params for the dashboard search/filter (FR-6).
export class QueryJobDto {
  @IsOptional() @IsString()
  q?: string;

  @IsOptional() @IsString()
  company?: string;

  @IsOptional() @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional() @IsString()
  tag?: string;

  // Inclusive ISO dates filtering on createdAt
  @IsOptional() @IsISO8601()
  from?: string;

  @IsOptional() @IsISO8601()
  to?: string;
}
