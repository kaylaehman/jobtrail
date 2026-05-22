import { IsArray, IsEmail, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

// Whitelisted date format tokens — kept narrow on purpose so the frontend dropdown
// and backend stay in lockstep. Add new options here when adding to the dropdown.
export const DATE_FORMAT_OPTIONS = [
  'M/d/yy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'EEEE, MMM d, yyyy',
  'MMM d, yyyy',
  'd MMM yyyy',
] as const;

export type DateFormatOption = (typeof DATE_FORMAT_OPTIONS)[number];

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @IsIn(DATE_FORMAT_OPTIONS as unknown as string[])
  dateFormat?: DateFormatOption;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recentTags?: string[];

  // Empty-string "clears" the field; otherwise must be a real email so SEC EDGAR doesn't 403.
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  contactEmail?: string;
}
