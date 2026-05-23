-- The user-managed URL of the company's careers portal for *this* application — distinct from
-- `job_url` (the public listing). Surfaced as a clickable link on the JobDetail page so the user
-- can jump straight to the portal to check application status without re-searching.
ALTER TABLE "job_applications" ADD COLUMN "application_portal_url" TEXT;
