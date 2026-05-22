-- Drop the redundant JobApplication.companyUrl column. The same URL info now lives in
-- Company.domain (dedup key) and Company.website (enriched canonical URL), and the
-- backfill script + auto-link on create() route incoming URLs there directly.
ALTER TABLE "job_applications" DROP COLUMN "company_url";
