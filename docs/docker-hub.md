# JobTrail

**Self-hosted job-application tracker** with a JobSpy-powered discovery pipeline and a keyless company-enrichment layer (Wikipedia + Wikidata + SEC EDGAR). Built for one user, dark-themed, no auth, no external LLM calls.

This is one of three images that make up the JobTrail stack:

| Image | Role |
| --- | --- |
| `kaylaehman/jobtrail-frontend` | React + Vite UI behind nginx (serves the SPA + reverse-proxies `/api/*` to the backend) |
| `kaylaehman/jobtrail-backend` | NestJS API + Prisma ORM. Owns business logic, enrichment orchestration, scheduled cron. |
| `kaylaehman/jobtrail-jobspy` | FastAPI sidecar wrapping [python-jobspy](https://github.com/speedyapply/JobSpy) for the Discover flow. |

All three are **multi-arch** (`linux/amd64` + `linux/arm64`) so the same images work on Intel/AMD desktops, Apple Silicon, and ARM SBCs.

---

## Quick start (Docker Desktop / Docker Engine)

```bash
curl -O https://raw.githubusercontent.com/kaylaehman/jobtrail/main/compose.hub.yml
docker compose -f compose.hub.yml up -d
```

Open <http://localhost:3000>. First-time Postgres init + migrations + seed take about 30 seconds.

Stop and remove everything (including the DB volume):

```bash
docker compose -f compose.hub.yml down -v
```

---

## What's included

- **Dashboard** — sortable table of every tracked application, with status/tag/industry/job-type filters
- **Discover** — paginated JobSpy search across LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter. Include/exclude keyword filters to cut noise (e.g. searching "Junior Architect" while hiding "cloud, aws, devops"). 1-click import.
- **Companies** — grid view of every enriched company, with a per-company detail page showing logo (via Clearbit), Wikipedia description, founded year, employees, revenue, industry, HQ
- **Disambiguation picker** — when the auto-matched company is wrong, search Wikidata and pick the right entity. Rejections stick.
- **Activity feed** — global chronological log of status changes + free-form notes, per-app or across-everything
- **Settings** — date format, recently used tags, contact-email (required for SEC EDGAR fair-use policy), and a type-to-confirm "nuke all data" reset

---

## Configuration

The `compose.hub.yml` exposes everything via environment variables. Useful overrides:

| Var | Default | Purpose |
| --- | --- | --- |
| `JOBTRAIL_FRONTEND_PORT` | `3000` | Host port to expose the UI on |
| `JOBTRAIL_IMAGE_TAG` | `latest` | Pin to a specific `sha-<commit>` tag to roll back |
| `JOBTRAIL_IMAGE_NAMESPACE` | `kaylaehman` | Override if you've forked + republished under your own Docker Hub account |
| `POSTGRES_PASSWORD` | `jobtrail` | Change for any production-ish use |
| `JOBSPY_CACHE_TTL` | `600` | Seconds to cache identical JobSpy queries |
| `JOBSPY_PROXIES` | _(empty)_ | Comma-separated proxy list — required if you hammer LinkedIn |

---

## Source + full documentation

<https://github.com/kaylaehman/jobtrail>

---

## License

MIT.
