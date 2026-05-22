import { Injectable, Logger } from '@nestjs/common';
import { EnrichedFields, EnrichmentInput, EnrichmentSource } from './source.interface';
import { EnrichmentHttp } from './enrichment-http';
import { EdgarTickerCache } from './edgar-ticker-cache';
import { normalizeName } from '../name-normalizer';

const SUBMISSIONS_URL = (cik: string) => `https://data.sec.gov/submissions/CIK${cik}.json`;
const COMPANYFACTS_URL = (cik: string) => `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

// Revenue concept priority. ASC 606 (effective ~2018) replaced the older catch-all; very old
// filings used SalesRevenueNet. Walk the list and take the first concept with annual data.
const REVENUE_CONCEPTS = [
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenues',
  'SalesRevenueNet',
];

interface SubmissionsResponse {
  cik?: string;
  name?: string;
  sic?: string;
  sicDescription?: string;
  addresses?: {
    business?: AddressEntry;
    mailing?: AddressEntry;
  };
}

interface AddressEntry {
  city?: string;
  stateOrCountry?: string;
  stateOrCountryDescription?: string;
}

interface XbrlFact {
  end: string;       // ISO date "2024-12-31"
  val: number;
  form: string;      // "10-K", "10-Q", ...
  fy?: number;
  fp?: string;       // "FY", "Q1", ...
}

interface CompanyFactsResponse {
  facts?: {
    'us-gaap'?: Record<string, { units?: { USD?: XbrlFact[] } }>;
    dei?: { EntityNumberOfEmployees?: { units?: { pure?: XbrlFact[] } } };
  };
}

@Injectable()
export class EdgarSource implements EnrichmentSource {
  readonly name = 'edgar';
  private readonly logger = new Logger(EdgarSource.name);

  constructor(
    private readonly http: EnrichmentHttp,
    private readonly tickers: EdgarTickerCache,
  ) {}

  async enrich(input: EnrichmentInput): Promise<Partial<EnrichedFields> | null> {
    await this.tickers.ensureReady();
    const cik = this.findCik(input.name);
    if (!cik) {
      this.logger.log(`no EDGAR ticker match for "${input.name}"`);
      return null;
    }
    const [sub, facts] = await Promise.all([
      this.fetchSubmissions(cik),
      this.fetchCompanyFacts(cik),
    ]);
    return this.toFields(cik, sub, facts);
  }

  // TODO(user): optionally add a Jaro-Winkler fuzzy backstop here. The ticker file has ~12k
  // entries and exact-normalized matches will miss real cases like "American Eagle Outfitters"
  // when the user types "American Eagle". Pattern: walk `this.tickers.keys()`, accept ≥0.95.
  // Threshold is intentionally tighter than CompaniesService dedup (0.92) — a wrong CIK match
  // pollutes revenue/employees with the wrong company's data, which is a worse failure mode.
  private findCik(name: string): string | null {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    return this.tickers.lookup(normalized);
  }

  private async fetchSubmissions(cik: string): Promise<SubmissionsResponse | null> {
    try {
      return await this.http.get<SubmissionsResponse>(SUBMISSIONS_URL(cik));
    } catch (err) {
      this.logger.warn(`EDGAR submissions failed for CIK ${cik}: ${(err as Error).message}`);
      return null;
    }
  }

  private async fetchCompanyFacts(cik: string): Promise<CompanyFactsResponse | null> {
    try {
      return await this.http.get<CompanyFactsResponse>(COMPANYFACTS_URL(cik));
    } catch (err) {
      this.logger.warn(`EDGAR companyfacts failed for CIK ${cik}: ${(err as Error).message}`);
      return null;
    }
  }

  private toFields(
    cik: string,
    sub: SubmissionsResponse | null,
    facts: CompanyFactsResponse | null,
  ): Partial<EnrichedFields> {
    const out: Partial<EnrichedFields> = { cik };

    if (sub) {
      if (sub.sicDescription) out.industry = sub.sicDescription;
      const addr = sub.addresses?.business ?? sub.addresses?.mailing;
      if (addr?.city) {
        const region = addr.stateOrCountryDescription || addr.stateOrCountry;
        out.hqLocation = region ? `${addr.city}, ${region}` : addr.city;
      }
    }

    if (facts) {
      const revenue = this.extractRevenue(facts);
      if (revenue) {
        out.revenueUsd = revenue.value;
        out.revenueAsOf = revenue.asOf;
      }
      const employees = this.extractEmployees(facts);
      if (employees) {
        out.employees = employees.value;
        out.employeesAsOf = employees.asOf;
      }
    }

    return out;
  }

  private extractRevenue(facts: CompanyFactsResponse): { value: bigint; asOf: Date } | null {
    for (const concept of REVENUE_CONCEPTS) {
      const usd = facts.facts?.['us-gaap']?.[concept]?.units?.USD;
      if (!usd || usd.length === 0) continue;
      const latest = this.pickLatestAnnual(usd);
      if (latest && latest.val > 0) {
        return { value: BigInt(Math.round(latest.val)), asOf: new Date(latest.end) };
      }
    }
    return null;
  }

  private extractEmployees(facts: CompanyFactsResponse): { value: number; asOf: Date } | null {
    const pure = facts.facts?.dei?.EntityNumberOfEmployees?.units?.pure;
    if (!pure || pure.length === 0) return null;
    const latest = this.pickLatestAnnual(pure);
    if (!latest || latest.val <= 0) return null;
    return { value: Math.round(latest.val), asOf: new Date(latest.end) };
  }

  // Take the most recent 10-K (annual report) fact. 10-Q quarterly numbers would be
  // misleading: a Q3 revenue snapshot is mid-year, not full-year. If no 10-K exists
  // (rare — typically only for newly-public companies), this returns null and the
  // field is left unset rather than substituting a worse number.
  private pickLatestAnnual(facts: XbrlFact[]): XbrlFact | null {
    const annual = facts.filter((f) => f.form === '10-K');
    if (annual.length === 0) return null;
    return annual.reduce((latest, cur) => (cur.end > latest.end ? cur : latest));
  }
}
