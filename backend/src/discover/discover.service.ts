import { HttpException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { JobsService } from '../jobs/jobs.service';
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

  constructor(private readonly jobs: JobsService) {
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
    return this.jobs.upsertFromSource({
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
      status: 'saved',
    });
  }
}
