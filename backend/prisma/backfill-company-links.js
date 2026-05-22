// One-time backfill — links existing JobApplication rows (companyId=null) to a Company by
// resolving via normalized name / domain. Mirrors the auto-link logic JobsService.create()
// runs for new entries, so apps created BEFORE that fix landed get cleaned up.
//
// Run inside the backend container:
//   docker exec -it <backend-container> node prisma/backfill-company-links.js
// Or via the Portainer UI: open the backend container → Console → exec the command above.
//
// Safe to re-run — idempotent. Skips applications already linked or marked rejected.
//
// Does NOT trigger enrichment: lastEnrichedAt stays null on newly-created Company rows so
// either the next page view + refresh button, or the weekly cron (Sundays 03:00), picks
// them up. Doing enrichment inline would tie up this script for minutes hitting upstream APIs.

const { PrismaClient } = require('@prisma/client');
// Same dedup key the live service uses — must match exactly so backfilled rows collide with
// any company already created by the regular import flow.
const { normalizeName } = require('../dist/companies/name-normalizer');

async function main() {
  const prisma = new PrismaClient();

  const apps = await prisma.jobApplication.findMany({
    // 'rejected' = user explicitly said "wrong company" — never auto-link.
    where: { companyId: null, companyMatchStatus: { not: 'rejected' } },
    select: { id: true, company: true, companyUrl: true },
  });

  if (apps.length === 0) {
    console.log('Nothing to backfill — every non-rejected application already has a companyId.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${apps.length} application(s) without a Company link. Resolving…\n`);

  // Cache by dedup key so identical company strings across multiple applications only
  // resolve once. Keeps the DB round-trips proportional to unique companies, not rows.
  const cache = new Map();
  let linked = 0;
  let createdCompanies = 0;

  for (const app of apps) {
    const cleanDomain = app.companyUrl
      ? app.companyUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || null
      : null;
    const normalized = normalizeName(app.company || '');
    if (!normalized) {
      console.log(`  skip ${app.id}: empty normalized name from "${app.company}"`);
      continue;
    }

    const cacheKey = cleanDomain ?? `name:${normalized}`;
    let company = cache.get(cacheKey);

    if (!company) {
      if (cleanDomain) {
        company = await prisma.company.findUnique({ where: { domain: cleanDomain } });
      }
      if (!company) {
        company = await prisma.company.findUnique({ where: { normalizedName: normalized } });
        // Backfill domain on an existing name-matched row if the import learned one.
        if (company && cleanDomain && !company.domain) {
          company = await prisma.company.update({
            where: { id: company.id },
            data: { domain: cleanDomain },
          });
        }
      }
      if (!company) {
        company = await prisma.company.create({
          data: { name: app.company, normalizedName: normalized, domain: cleanDomain },
        });
        createdCompanies += 1;
      }
      cache.set(cacheKey, company);
    }

    await prisma.jobApplication.update({
      where: { id: app.id },
      data: { companyId: company.id },
    });
    linked += 1;
    console.log(`  ${app.id}: "${app.company}" -> ${company.id} (${company.name})`);
  }

  console.log(`\nDone. Linked ${linked} application(s); created ${createdCompanies} new Company row(s).`);
  console.log('Enrichment will run lazily — open a company in the UI and hit ↻, or wait for the Sunday 03:00 cron.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
