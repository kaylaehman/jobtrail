-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('manual', 'linkedin', 'indeed', 'glassdoor', 'google', 'ziprecruiter');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('saved', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('online_assessment', 'hr_screen', 'technical', 'manager', 'final', 'other');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('scheduled', 'completed', 'passed', 'rejected', 'waiting');

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "source" "JobSource" NOT NULL DEFAULT 'manual',
    "source_job_id" TEXT,
    "job_url" TEXT,
    "location" TEXT,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'saved',
    "applied_at" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extracted_skills" JSONB,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_rounds" (
    "id" TEXT NOT NULL,
    "job_application_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "type" "RoundType" NOT NULL DEFAULT 'other',
    "scheduled_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "interviewer" TEXT,
    "status" "RoundStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_source_source_job_id_key" ON "job_applications"("source", "source_job_id");

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateIndex
CREATE INDEX "job_applications_company_idx" ON "job_applications"("company");

-- CreateIndex
CREATE UNIQUE INDEX "interview_rounds_job_application_id_round_number_key" ON "interview_rounds"("job_application_id", "round_number");

-- CreateIndex
CREATE INDEX "interview_rounds_job_application_id_idx" ON "interview_rounds"("job_application_id");

-- AddForeignKey
ALTER TABLE "interview_rounds" ADD CONSTRAINT "interview_rounds_job_application_id_fkey" FOREIGN KEY ("job_application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
