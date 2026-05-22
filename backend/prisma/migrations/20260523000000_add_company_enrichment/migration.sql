-- Enriched company profile (free public APIs: Wikipedia, Wikidata, SEC EDGAR).
-- domain and normalized_name are both unique so dedup works whether or not JobSpy gave us a URL.
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "domain" TEXT,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "wikipedia_url" TEXT,
    "wikidata_qid" TEXT,
    "cik" TEXT,
    "employees" INTEGER,
    "employees_as_of" TIMESTAMP(3),
    "revenue_usd" BIGINT,
    "revenue_as_of" TIMESTAMP(3),
    "founded_year" INTEGER,
    "hq_location" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "sources" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "last_enriched_at" TIMESTAMP(3),
    "enrichment_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_domain_key" ON "companies"("domain");
CREATE UNIQUE INDEX "companies_normalized_name_key" ON "companies"("normalized_name");
CREATE INDEX "companies_last_enriched_at_idx" ON "companies"("last_enriched_at");

-- Application snapshot of `company` (string) stays; companyId adds the FK without losing import data.
-- ON DELETE SET NULL: pruning a junk Company row does not cascade into application loss.
ALTER TABLE "job_applications" ADD COLUMN "company_id" TEXT;
CREATE INDEX "job_applications_company_id_idx" ON "job_applications"("company_id");
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7-day TTL HTTP response cache keyed by URL. Lets dev iterate on enrichment logic without
-- re-hitting upstream (especially EDGAR, which is strict about rate limits and User-Agent).
CREATE TABLE "enrichment_cache" (
    "url" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "status" INTEGER NOT NULL,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrichment_cache_pkey" PRIMARY KEY ("url")
);

CREATE INDEX "enrichment_cache_expires_at_idx" ON "enrichment_cache"("expires_at");
