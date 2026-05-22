-- Free-form user notes per JobApplication. Cascades on application delete.
CREATE TABLE "job_notes" (
    "id" TEXT NOT NULL,
    "job_application_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_notes_jaid_created_at_idx"
    ON "job_notes"("job_application_id", "created_at");

ALTER TABLE "job_notes"
    ADD CONSTRAINT "job_notes_jaid_fkey"
    FOREIGN KEY ("job_application_id") REFERENCES "job_applications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
