-- Employment type per JobSpy's vocabulary. Nullable so existing rows backfill as null
-- (users can edit them later via JobForm), and so the manual Add Job flow doesn't force a choice.
CREATE TYPE "JobType" AS ENUM ('fulltime', 'parttime', 'contract', 'internship');

ALTER TABLE "job_applications" ADD COLUMN "job_type" "JobType";
