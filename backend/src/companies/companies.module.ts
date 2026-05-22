import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { EnrichmentService } from './enrichment/enrichment.service';
import { EnrichmentHttp } from './enrichment/enrichment-http';
import { WikipediaSource } from './enrichment/wikipedia.source';
import { WikidataSource } from './enrichment/wikidata.source';
import { WikidataClient } from './enrichment/wikidata-client';
import { ENRICHMENT_SOURCES } from './enrichment/source.interface';

@Module({
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    EnrichmentService,
    EnrichmentHttp,
    WikidataClient,
    WikipediaSource,
    WikidataSource,
    // Multi-provider: declaration order here = run order in EnrichmentService.enrich.
    // Wikipedia first (cheapest, often supplies the QID Wikidata then reuses), Wikidata second.
    // EDGAR will be appended in step 4.
    {
      provide: ENRICHMENT_SOURCES,
      useFactory: (wp: WikipediaSource, wd: WikidataSource) => [wp, wd],
      inject: [WikipediaSource, WikidataSource],
    },
  ],
  exports: [CompaniesService],
})
export class CompaniesModule {}
