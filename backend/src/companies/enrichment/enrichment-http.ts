import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Per-host throttle. EDGAR explicitly publishes a 10 req/sec ceiling; the others are looser
// but Wikidata SPARQL is slow enough that hammering it just queues up timeouts on our side.
interface HostConfig {
  minGapMs: number;
  maxConcurrent: number;
}
const HOST_CONFIG: Record<string, HostConfig> = {
  'data.sec.gov':       { minGapMs: 110, maxConcurrent: 5 },
  'www.sec.gov':        { minGapMs: 110, maxConcurrent: 5 },
  'en.wikipedia.org':   { minGapMs: 50,  maxConcurrent: 8 },
  'www.wikidata.org':   { minGapMs: 50,  maxConcurrent: 8 },
  'query.wikidata.org': { minGapMs: 200, maxConcurrent: 2 },
};
const DEFAULT_CONFIG: HostConfig = { minGapMs: 100, maxConcurrent: 4 };

// SEC EDGAR's fair-use policy (https://www.sec.gov/os/accessing-edgar-data) requires the
// User-Agent to include a contact email so they can reach you about abusive traffic. Without
// it they 403. Wikidata's policy is similar but less strict. JOBTRAIL_CONTACT_EMAIL lets the
// operator override; the fallback uses the GitHub-provided no-reply email, which is a real
// deliverable address that forwards to the project owner.
const CONTACT_EMAIL =
  process.env.JOBTRAIL_CONTACT_EMAIL || '177765088+kaylaehman@users.noreply.github.com';
const USER_AGENT = `JobTrail/0.1 ${CONTACT_EMAIL} (https://github.com/kaylaehman/jobtrail)`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class EnrichmentHttp {
  private readonly logger = new Logger(EnrichmentHttp.name);
  private readonly lastCallAt = new Map<string, number>();
  private readonly inFlight = new Map<string, number>();
  private readonly waiters = new Map<string, Array<() => void>>();

  constructor(private readonly prisma: PrismaService) {}

  async get<T = unknown>(
    url: string,
    opts: { headers?: Record<string, string>; cacheable?: boolean } = {},
  ): Promise<T> {
    const cacheable = opts.cacheable ?? true;
    if (cacheable) {
      const hit = await this.readCache<T>(url);
      if (hit !== null) return hit;
    }

    const host = new URL(url).host;
    await this.acquireSlot(host);
    try {
      const cfg: AxiosRequestConfig = {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...opts.headers },
        timeout: 30_000,
        // Treat 4xx as a real response (some sources handle 404 themselves); throw on 5xx.
        validateStatus: (s) => s < 500,
      };
      const { data, status } = await axios.get<T>(url, cfg);
      if (cacheable && status >= 200 && status < 300) {
        await this.writeCache(url, data, status);
      }
      if (status >= 400) {
        throw new HttpError(url, status);
      }
      return data;
    } finally {
      this.releaseSlot(host);
    }
  }

  private async acquireSlot(host: string): Promise<void> {
    const cfg = HOST_CONFIG[host] ?? DEFAULT_CONFIG;
    while ((this.inFlight.get(host) ?? 0) >= cfg.maxConcurrent) {
      await new Promise<void>((resolve) => {
        const q = this.waiters.get(host) ?? [];
        q.push(resolve);
        this.waiters.set(host, q);
      });
    }
    const last = this.lastCallAt.get(host) ?? 0;
    const wait = Math.max(0, last + cfg.minGapMs - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.inFlight.set(host, (this.inFlight.get(host) ?? 0) + 1);
    this.lastCallAt.set(host, Date.now());
  }

  private releaseSlot(host: string): void {
    this.inFlight.set(host, Math.max(0, (this.inFlight.get(host) ?? 0) - 1));
    const q = this.waiters.get(host);
    const next = q?.shift();
    next?.();
  }

  private async readCache<T>(url: string): Promise<T | null> {
    const row = await this.prisma.enrichmentCache.findUnique({ where: { url } });
    if (!row) return null;
    if (row.expiresAt < new Date()) {
      this.prisma.enrichmentCache.delete({ where: { url } }).catch(() => undefined);
      return null;
    }
    return row.body as T;
  }

  private async writeCache(url: string, body: unknown, status: number): Promise<void> {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    try {
      await this.prisma.enrichmentCache.upsert({
        where: { url },
        create: { url, body: body as Prisma.InputJsonValue, status, expiresAt },
        update: { body: body as Prisma.InputJsonValue, status, cachedAt: new Date(), expiresAt },
      });
    } catch (err) {
      this.logger.warn(`cache write failed for ${url}: ${(err as Error).message}`);
    }
  }
}

export class HttpError extends Error {
  constructor(public readonly url: string, public readonly status: number) {
    super(`HTTP ${status} from ${url}`);
  }
}
