import { HttpException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { JobsService } from '../jobs/jobs.service';
import { CompaniesService } from '../companies/companies.service';
import { DiscoverImportDto, DiscoverSearchDto } from './dto/discover.dto';

// Shape returned by the JobSpy sidecar — keep it loose; the sidecar normalizes the DataFrame.
interface JobSpyResult {
  site: string;
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  job_url: string | null;
  description: string | null;
  is_remote: boolean | null;
  min_amount: number | null;
  max_amount: number | null;
  currency: string | null;
  date_posted: string | null;
  job_type: string | null;
}

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);
  private readonly http: AxiosInstance;

  constructor(
    private readonly jobs: JobsService,
    private readonly companies: CompaniesService,
  ) {
    this.http = axios.create({
      baseURL: process.env.JOBSPY_URL ?? 'http://jobspy:8001',
      timeout: 60_000,
    });
  }

  async search(dto: DiscoverSearchDto) {
    try {
      const { data } = await this.http.post<{ results: JobSpyResult[]; cached: boolean }>(
        '/search',
        {
          site_name: dto.sites,
          search_term: dto.searchTerm,
          location: dto.location,
          results_wanted: dto.resultsWanted ?? 25,
          offset: dto.offset ?? 0,
          hours_old: dto.hoursOld,
          is_remote: dto.isRemote,
          job_type: dto.jobType,
        },
      );
      return data;
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.detail ?? err.message
        : 'unknown jobspy error';
      this.logger.error(`JobSpy search failed: ${message}`);
      throw new HttpException({ error: 'jobspy_unreachable', message }, 502);
    }
  }

  async import(dto: DiscoverImportDto) {
    let app = await this.jobs.upsertFromSource({
      source: dto.source,
      sourceJobId: dto.sourceJobId,
      company: dto.company,
      position: dto.position,
      jobUrl: dto.jobUrl,
      location: dto.location,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      salaryCurrency: dto.salaryCurrency,
      remote: dto.remote,
      description: dto.description,
      jobType: dto.jobType,
      status: 'saved',
    });

    // Auto-link the application to its enriched Company row. `confirmed` and `rejected` are
    // explicit user decisions — never overwrite on re-import. Only `auto` (the default for
    // new rows and for never-touched existing rows) gets the auto-resolution treatment.
    if (app.companyMatchStatus === 'auto') {
      const company = await this.companies.findOrCreateByNameOrDomain(dto.company, dto.companyUrl);
      if (app.companyId !== company.id) {
        app = await this.jobs.setCompanyId(app.id, company.id);
      }
      // Fire-and-forget enrichment if the company hasn't been enriched recently. The import
      // response returns immediately — frontend re-fetches Company by id when rendering panels.
      this.companies.enqueueIfStale(company);
    }

    return app;
  }
}
