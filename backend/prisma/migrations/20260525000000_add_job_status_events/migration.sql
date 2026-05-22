-- Append-only log of status transitions per job application. from_status is null for
-- the synthetic initial event (created-with-status-X) so the timeline has a starting marker.
CREATE TABLE "job_status_events" (
    "id" TEXT NOT NULL,
    "job_application_id" TEXT NOT NULL,
    "from_status" "JobStatus",
    "to_status" "JobStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_status_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_status_events_jaid_created_at_idx"
    ON "job_status_events"("job_application_id", "created_at");

ALTER TABLE "job_status_events"
    ADD CONSTRAINT "job_status_events_jaid_fkey"
    FOREIGN KEY ("job_application_id") REFERENCES "job_applications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one synthetic "created with status X" event per existing application so the
-- timeline has a starting point. md5+random produces unique IDs without requiring pgcrypto.
INSERT INTO "job_status_events" (id, job_application_id, to_status, created_at)
SELECT
    'evt_' || substr(md5(random()::text || clock_timestamp()::text || id), 1, 24),
    id,
    status,
    created_at
FROM "job_applications";
