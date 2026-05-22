import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import {
  CompanyListItem,
  CompanyResponse,
  QidDto,
  toCompanyListItem,
  toCompanyResponse,
} from './dto/company.dto';
import { WikidataCandidate } from './enrichment/wikidata-client';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('industry') industry?: string,
  ): Promise<CompanyListItem[]> {
    const rows = await this.companies.list({ q, industry });
    return rows.map(toCompanyListItem);
  }

  // GET /api/companies/search?q=... — Wikidata candidate search for the disambiguation picker UI.
  // Defined before `:id` so the route doesn't get swallowed by the param matcher.
  @Get('search')
  search(@Query('q') q: string): Promise<WikidataCandidate[]> {
    return this.companies.searchWikidata(q);
  }

  // POST /api/companies/from-wikidata — used by the picker to create-or-find a Company by QID.
  @Post('from-wikidata')
  async fromWikidata(@Body() dto: QidDto): Promise<CompanyResponse> {
    return toCompanyResponse(await this.companies.findOrCreateByQid(dto.qid));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CompanyResponse> {
    return toCompanyResponse(await this.companies.findOne(id));
  }

  @Get('by-application/:appId')
  async byApplication(@Param('appId') appId: string): Promise<CompanyResponse | null> {
    const c = await this.companies.findByApplication(appId);
    return c ? toCompanyResponse(c) : null;
  }

  @Post(':id/refresh')
  async refresh(@Param('id') id: string): Promise<CompanyResponse> {
    return toCompanyResponse(await this.companies.refresh(id));
  }
}
