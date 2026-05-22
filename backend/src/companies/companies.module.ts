import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { EnrichmentService } from './enrichment/enrichment.service';
import { EnrichmentHttp } from './enrichment/enrichment-http';
import { WikipediaSource } from './enrichment/wikipedia.source';
import { WikidataSource } from './enrichment/wikidata.source';
import { WikidataClient } from './enrichment/wikidata-client';
import { EdgarSource } from './enrichment/edgar.source';
import { EdgarTickerCache } from './enrichment/edgar-ticker-cache';
import { CompanyEnrichmentCron } from './company-enrichment-cron.service';
import { ENRICHMENT_SOURCES } from './enrichment/source.interface';

@Module({
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    EnrichmentService,
    EnrichmentHttp,
    WikidataClient,
    EdgarTickerCache,
    WikipediaSource,
    WikidataSource,
    EdgarSource,
    CompanyEnrichmentCron,
    // Multi-provider: declaration order here = run order in EnrichmentService.enrich.
    // Wikipedia first (cheapest, often supplies the QID Wikidata reuses), Wikidata second
    // (structured pan-international data), EDGAR last (authoritative on revenue/employees
    // for US public companies; merge logic decides whether it overrides earlier values).
    {
      provide: ENRICHMENT_SOURCES,
      useFactory: (wp: WikipediaSource, wd: WikidataSource, ed: EdgarSource) => [wp, wd, ed],
      inject: [WikipediaSource, WikidataSource, EdgarSource],
    },
  ],
  exports: [CompaniesService, EdgarTickerCache],
})
export class CompaniesModule {}
