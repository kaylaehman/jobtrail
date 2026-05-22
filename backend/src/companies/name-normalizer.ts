// Shared dedup key — see conversation history for the suffix-list trade-off.
// Used by both CompaniesService (online import dedup) and EdgarTickerCache (SEC ticker map).
// They MUST share this function so "Chevron Corp." (import) and "Chevron Corporation"
// (SEC's filed name) collapse to the same key and produce a CIK match.
const COMPANY_SUFFIXES =
  /\b(incorporated|corporation|company|limited|inc|llc|ltd|corp|co|gmbh|sa|sas|ag|plc|pty|kk|nv|bv|lp)\b/g;

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&]/gu, ' ')
    .replace(COMPANY_SUFFIXES, ' ')
    .replace(/\s+&\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
