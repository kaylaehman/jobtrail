-- Add companyUrl to job_applications (nullable, so backfill is implicit).
ALTER TABLE "job_applications" ADD COLUMN "company_url" TEXT;

-- Single-row user settings table — id is fixed to "default" because this is a single-user local app.
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "date_format" TEXT NOT NULL DEFAULT 'yyyy-MM-dd',
    "recent_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);
