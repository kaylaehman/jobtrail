-- Per-application disambiguation state. Default `auto` matches the post-import state for
-- existing rows (which were all auto-matched, so the default is correct on backfill too).
CREATE TYPE "CompanyMatchStatus" AS ENUM ('auto', 'confirmed', 'rejected');

ALTER TABLE "job_applications"
    ADD COLUMN "company_match_status" "CompanyMatchStatus" NOT NULL DEFAULT 'auto';
