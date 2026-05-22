import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

// Safety: the confirm phrase has to match exactly. Stops accidental curl/UI misclicks from
// wiping a year of job-tracking data. Frontend asks the user to type "DELETE_ALL_DATA" to enable
// the action — the literal string in the request body is what the validator checks.
export class ResetSettingsDto {
  @IsString()
  @IsIn(['DELETE_ALL_DATA'])
  confirm!: 'DELETE_ALL_DATA';

  // Opt-in: also clear the 7-day HTTP cache for Wikipedia/Wikidata/EDGAR responses.
  // Default-off because keeping the cache makes the next enrichment run much faster, and the
  // cache contents are not "your data" in the same sense as your job applications are.
  @IsOptional()
  @IsBoolean()
  wipeEnrichmentCache?: boolean;
}
