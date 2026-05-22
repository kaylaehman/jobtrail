import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RoundStatus, RoundType } from '@prisma/client';

export class CreateRoundDto {
  @IsOptional() @IsInt() @Min(1)
  roundNumber?: number; // auto-assigned by the service when omitted

  @IsOptional() @IsEnum(RoundType)
  type?: RoundType;

  @IsOptional() @IsISO8601()
  scheduledAt?: string;

  @IsOptional() @IsInt() @Min(0)
  durationMinutes?: number;

  @IsOptional() @IsString()
  interviewer?: string;

  @IsOptional() @IsEnum(RoundStatus)
  status?: RoundStatus;

  @IsOptional() @IsString()
  notes?: string;
}
