import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EnrichmentService } from './enrichment/enrichment.service';
import { EdgarTickerCache } from './enrichment/edgar-ticker-cache';

// Sundays at 03:00. Quiet enough that any rate-limit hiccups don't collide with active use.
const SCHEDULE = '0 3 * * 0';
const BATCH_SIZE = 50;

@Injectable()
export class CompanyEnrichmentCron {
  private readonly logger = new Logger(CompanyEnrichmentCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrichment: EnrichmentService,
    private readonly tickers: EdgarTickerCache,
  ) {}

  // Picks the 50 stalest companies (nulls first — never-enriched rows are stalest of all) and
  // re-runs the full pipeline. Also force-refreshes the EDGAR ticker cache so a freshly-added
  // public company shows up by the next import.
  @Cron(SCHEDULE)
  async refreshStalestCompanies(): Promise<void> {
    this.logger.log('Weekly company re-enrichment starting');
    try {
      await this.tickers.refresh();
    } catch (err) {
      this.logger.warn(`EDGAR ticker refresh failed: ${(err as Error).message}`);
    }

    const stale = await this.prisma.company.findMany({
      orderBy: [{ lastEnrichedAt: { sort: 'asc', nulls: 'first' } }],
      take: BATCH_SIZE,
    });

    let succeeded = 0;
    let failed = 0;
    for (const company of stale) {
      try {
        await this.enrichment.enrich(company);
        succeeded += 1;
      } catch (err) {
        failed += 1;
        this.logger.warn(`re-enrichment failed for ${company.name} (${company.id}): ${(err as Error).message}`);
      }
    }
    this.logger.log(`Weekly re-enrichment finished: ${succeeded} ok, ${failed} failed`);
  }
}
