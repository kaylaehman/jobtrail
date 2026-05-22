import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { EnrichmentService } from './enrichment/enrichment.service';
import { EnrichmentHttp } from './enrichment/enrichment-http';
import { WikipediaSource } from './enrichment/wikipedia.source';
import { ENRICHMENT_SOURCES } from './enrichment/source.interface';

@Module({
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    EnrichmentService,
    EnrichmentHttp,
    WikipediaSource,
    // Multi-provider: declaration order here = run order in EnrichmentService.enrich.
    // Wikidata and EDGAR will be appended in subsequent steps.
    {
      provide: ENRICHMENT_SOURCES,
      useFactory: (wp: WikipediaSource) => [wp],
      inject: [WikipediaSource],
    },
  ],
  exports: [CompaniesService],
})
export class CompaniesModule {}
