# JobTrail

![JobTrail — Track. Discover. Land.](./docs/jobtrail-banner.png)

A self-hosted job-application tracker with a JobSpy-powered discovery pipeline
and a keyless company-enrichment layer (Wikipedia + Wikidata + SEC EDGAR).

JobTrail started as **Phase 1 of the [AI Job Application Tracker spec](docs/REQUIREMENTS.md)** —
FR-1 through FR-7 (CRUD, multi-round timeline, skills extraction, notes, search,
deadline reminders) plus a one-click **Discover** flow that pulls jobs from
LinkedIn / Indeed / Glassdoor / Google / ZipRecruiter via
[python-jobspy](https://github.com/speedyapply/JobSpy). It has since grown
companion features around each application: enriched company profiles, a
disambiguation picker, a unified activity log (status changes + free-form
notes), industry/job-type filters, and a danger-zone data reset.

Everything runs locally behind `docker compose up`. No auth, no external LLM
calls — enrichment uses public keyless APIs only.

---

## Features by page

### Dashboard — `/`
<img width="2546" height="1307" alt="image" src="https://github.com/user-attachments/assets/de6e89b8-c7e1-4853-92c2-66058a48e615" />

The home page. Sortable table of every tracked application.

- **Columns**: Company → `/companies/:id`, Position → `/jobs/:id`, Status pill, Applied date, Job type, Tags. Every column header sorts ascending/descending on click; dates sort newest-first by default, everything else alphabetical.
- **Deadline badge** inline on company name — amber/red countdown when `deadline` is within the next week, gray when past.
- **Filters** (six along the search bar):
  - Free-text `q` — substring across company + position + description
  - Status dropdown
  - Tag filter (exact match against the application's `tags[]` array)
  - **Industry filter** — comma-separated → OR-matched (substring, case-insensitive) against the linked Company's `industry` field. `petroleum, consulting` returns applications at either kind of company.
  - **Job type** dropdown (Full-time / Part-time / Contract / Internship)
- **"+ Add Job"** button routes to the create form.

### Discover — `/discover`
<img width="2506" height="1303" alt="image" src="https://github.com/user-attachments/assets/9a00a89e-d229-47fb-b875-54e6e5aa1982" />

JobSpy-backed search across LinkedIn / Indeed / Glassdoor / Google / ZipRecruiter. Identical queries are cached for 10 minutes in the sidecar to avoid rate-limit pain.

- **Site checkboxes** — pick any subset of the five sources
- **Search term** + **location** (free text)
- **Results wanted** (1–200), **Max age** in hours
- **Remote only** checkbox
- **Job type** dropdown — passed to JobSpy's native `job_type` param (Full-time / Part-time / Contract / Internship)
- **Include keywords** *(client-side post-filter)* — comma-separated; if any one matches the title + company + description (case-insensitive substring), the row is kept
- **Exclude keywords** *(client-side post-filter)* — comma-separated; if any one matches, the row is hidden. **Excludes always win** over includes — handy for "search Junior Architect but hide cloud/aws/devops noise"
- **Counter** shows `Showing N of M (K hidden by filter)` whenever a filter is active
- **Import button** per row — POSTs to `/api/discover/import` which upserts on `(source, sourceJobId)`, auto-resolves a Company row, and kicks off background enrichment. Re-importing the same row refreshes URL/salary/location/description but never overwrites your status or notes.

### Companies — `/companies`
<img width="2549" height="1305" alt="image" src="https://github.com/user-attachments/assets/821b2813-4b3d-4deb-8e61-2c1cf34ed212" />

Card grid of every Company row your imports have created or you've manually linked. Useful for spotting "I've applied to 4 different oil-and-gas firms" patterns.

- **Card content per company**: Clearbit logo (monogram fallback for unknown domains), name, application count badge (`3 apps`), industry · HQ · founded year, two-line description preview
- **Search** — client-side substring filter over name, industry, and HQ location
- Click a card → `/companies/:id`

### Company Detail — `/companies/:id`
<img width="2551" height="1309" alt="image" src="https://github.com/user-attachments/assets/253d88fc-ee26-42b8-9d5d-32dd6d7bd458" />

Full enriched profile for one company.

- **Logo + name + verified badge** (if confirmed by you via the picker on a JobDetail)
- **Description** (from Wikipedia), formatted plain text
- **Facts**: founded year, employee count, revenue ($X.XB, with `(FYxxxx)` tag), website
- **Last updated** timestamp + comma-separated `sources` list (`wikipedia, wikidata, edgar`)
- **Refresh button** — re-runs the full enrichment pipeline on demand
- **Wikipedia link** when present
- **Applications list** — every JobApplication linked to this company, with position name and current status pill, ordered by most recently updated

### Activity — `/activity`

Global feed of everything that's happened to your tracker, newest first. Capped at 500 items.

- **Status changes** — auto-logged whenever an application's status flips. Renders `Old → New` with colored pills. Initial creation appears as `Created as <status>`.
- **Notes** — your free-form text entries (see JobDetail).
- **Dots** — cyan for notes (user-driven), slate for status events (system-driven). Same visual convention as the per-job timeline.
- Each row includes a link back to the source application.

### Job Detail — `/jobs/:id`
<img width="2521" height="1310" alt="image" src="https://github.com/user-attachments/assets/1c7626f7-b3b6-44a4-a4bd-65f60b10275c" />

Full picture of a single application. Roughly in order down the page:

- **Header card**
  - Application status overview (`In Progress (Round 2/3) | Next: 2026-06-01`)
  - Company name → `/companies/:id`
  - Position, deadline badge, location, remote icon, job type, source listing URL
  - Status pill + status dropdown (changing the status here auto-logs an event in the timeline below)
  - Edit / Delete buttons
- **Company panel**
  - Three visual states driven by `companyMatchStatus`:
    - **auto** — enriched data + small "Is this the right company? ✓ Yes / ✗ Wrong" prompt
    - **confirmed** — enriched data + ✓ verified badge, no prompt
    - **rejected** — picker UI replaces the panel; "Restore auto-match" link to revert
  - Polls every 3s after import until enrichment lands, then stops
  - Refresh button re-runs all three sources
- **Activity card** — unified timeline of status changes + your notes, interleaved by date
  - **Textarea + Add note** button at the top — free-form text, up to 10k chars
  - Below, the merged log. Hover any note to reveal a delete button.
- **Rounds card** — ASCII-tree interview timeline (`├─ ./`)
  - Add round, edit any round (type / status / scheduled at / duration / interviewer / notes), delete
- **Skills chips** — categorized auto-extracted skills (languages, frameworks, databases, cloud, tools); editable
- **Description** — collapsible `<details>` block with the full job posting

### Add Job / Edit Job — `/jobs/new` and `/jobs/:id/edit`
<img width="2511" height="1212" alt="image" src="https://github.com/user-attachments/assets/29efd464-1052-482e-843a-6a04d136dbe3" />

Single form, used for both creation and editing.

- Company *(required)*, Position *(required)*
- Source (`manual` by default; otherwise `linkedin`/`indeed`/`glassdoor`/`google`/`ziprecruiter`)
- Job URL, Location, Remote checkbox
- **Job type** dropdown
- Salary min / max / currency
- Applied at, Deadline (calendar pickers)
- Tags — autocomplete via TagInput (suggests from your `recentTags` settings)
- Status dropdown
- Description — pasting in a job posting triggers skill extraction on save

### Settings — `/settings`
<img width="2514" height="1305" alt="image" src="https://github.com/user-attachments/assets/0359a83e-532c-4948-87d0-0ab19f73c7c6" />

Per-user preferences and destructive actions.

- **Contact email** *(required)* — used solely in the `User-Agent` header sent to upstream enrichment APIs. SEC EDGAR 403s requests without a real email per their fair-use policy. Until this is set, a prominent amber banner appears on every page linking back here.
- **Date format** — affects display of every date in the app (Applied, Deadline, Scheduled, etc). Preview row shows the chosen pattern formatted against today.
- **Recently used tags** — read-only list of the 50 most recent tags you've added. Powers the TagInput autocomplete on the Add/Edit form.
- **Danger zone — Reset all data**
  - Wipes job_applications, interview_rounds, job_status_events, job_notes, companies
  - Preserves your settings row (date format, recent tags, contact email)
  - Optional checkbox: also clear the 7-day HTTP enrichment cache
  - Type `DELETE_ALL_DATA` in the confirm field before the destructive button enables — same string the backend validator checks, so typo-proof
  - On success, a summary modal reports counts: `7 applications · 14 rounds · 21 status events · 5 companies cleared`

---

## Company enrichment pipeline

Every application is auto-linked at import (or manual create) to a `Company` row. A background pipeline pulls public-data facts from three keyless sources, in order:

| Source | Provides | Notes |
| --- | --- | --- |
| **Wikipedia** | description, logo image, Wikipedia URL | Direct title lookup → falls back to OpenSearch when the direct one 404s or is a disambiguation page |
| **Wikidata** | employees, revenue, founded year, HQ city, industry, official website, Wikidata QID, logo URL | Two-pass candidate selection: description keyword scan first, then P31 (`instance of`) verification on the top hit. SPARQL query for the structured facts. Non-USD revenue keeps the currency QID but never converts (no FX guessing). |
| **SEC EDGAR** | revenue (USD), employee count, SIC industry, HQ city/state, CIK | Only matches US public companies via a normalized-name → CIK lookup against `company_tickers.json`. Pulls the most recent **10-K annual** value, walking `RevenueFromContractWithCustomerExcludingAssessedTax` → `Revenues` → `SalesRevenueNet` in priority order. Requires a contact email in the UA. |

Dedup uses a **normalized-name** key (lowercase, suffix-stripped: `Chevron Corp.` / `Chevron Corporation` / `CHEVRON` → `chevron`) plus a **Jaro-Winkler fuzzy fallback** at threshold 0.92 for near-misses (typos, suffix variants the regex doesn't catch).

A weekly **cron** (Sundays 03:00) refreshes the 50 stalest companies and force-refreshes the EDGAR ticker cache. HTTP responses are cached in Postgres for 7 days to keep dev iteration cheap and avoid hammering upstreams.

When the system picks the wrong entity ("Apple" → Apple Inc when you meant Apple Records), the JobDetail Company panel has a rejection flow with a Wikidata-backed search picker. Rejections stick — once you say "wrong company", subsequent imports of the same source row will never auto-relink.

---

## Architecture

```
                ┌────────────┐
                │  frontend  │   :3000  React + Vite + Tailwind
                └─────┬──────┘
                      │
                ┌─────▼──────┐
                │  backend   │   :8000  NestJS + Prisma + class-validator
                └──┬───────┬─┘
                   │       │
       ┌───────────▼┐  ┌──▼──────────┐
       │     db     │  │   jobspy    │   :8001 (internal)  FastAPI + python-jobspy
       │ postgres16 │  │  +TTLCache  │
       └────────────┘  └─────────────┘
```

The `jobspy` sidecar is intentionally Python-only: JobSpy is a Python project
that scrapes per-site HTML/APIs. Porting it to TypeScript would be a multi-week
undertaking and would lose upstream maintenance.

---

## Prerequisites

- Docker Desktop / Docker Engine 24+ with Compose v2
- 2 GB free RAM, 2 GB free disk

That's it — no Node / Python / Postgres needed on the host.

## Quick start — try it without cloning

If you just want to spin up JobTrail with no setup, grab the prebuilt-image compose file from this repo and run it. Multi-arch images cover Intel/AMD, Apple Silicon, and ARM SBCs.

```sh
curl -O https://raw.githubusercontent.com/kaylaehman/jobtrail/main/compose.hub.yml
docker compose -f compose.hub.yml up -d
```

Open <http://localhost:3000>. First-time DB init + migrations + seed takes ~30 seconds. To stop and remove the volume:

```sh
docker compose -f compose.hub.yml down -v
```

The images live at <https://hub.docker.com/u/kaylaehman> — `jobtrail-frontend`, `jobtrail-backend`, `jobtrail-jobspy`. Pinning a specific build is just `JOBTRAIL_IMAGE_TAG=sha-abc1234 docker compose -f compose.hub.yml up -d`.

## Run from source (dev / local builds)

```sh
cp .env.example .env          # optional, only if you want to override defaults
docker compose up --build
```

| Service        | URL                                  | Notes                         |
| -------------- | ------------------------------------ | ----------------------------- |
| Frontend       | http://localhost:3000                | React app                     |
| Backend API    | http://localhost:8000/api/health     | NestJS                        |
| JobSpy sidecar | _internal_ (compose network)         | Reachable only from backend   |
| Postgres       | _internal_ (compose network)         | Persisted in `jobtrail_pgdata`|

On first boot the backend runs `prisma migrate deploy` and seeds three example
applications so the dashboard isn't empty.

---

## Verifying each functional requirement

After `docker compose up`, open <http://localhost:3000> and click through:

| FR   | Feature                            | How to verify                                                                                          |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| FR-1 | Job CRUD                           | Dashboard → **+ Add Job** → fill the form → save. Edit/delete from the application detail page.       |
| FR-2 | Multi-round progress tracking      | Open the seeded **TechCorp Inc.** job. The §8.2 ASCII-tree timeline shows Rounds 1–4 with status icons.|
| FR-3 | Save job description / requirements| Paste the description into the Add-job form's "Description / requirements" field — it persists.        |
| FR-4 | AI skills extraction               | Pasting a description triggers the local NLP extractor and shows §8.3 categorized chips.               |
| FR-5 | Notes & feedback per round         | On the detail page, hover any timeline round → ✏️ Edit → update the Notes textarea → Save. Free-form per-application notes also live in the **Activity** card.|
| FR-6 | Search & filter                    | Dashboard top bar: free-text `q`, status, tag, industry (comma-multi), job type.                       |
| FR-7 | Deadline reminders                 | The seeded **CloudCo** job has a deadline 5 days out → amber "🟡 Due in 5d" badge on the dashboard.  |
| New  | JobSpy discovery                   | **Discover** tab → pick sites → search → **Save to tracker** to import.                                |

---

## How JobSpy queries work

The Discover form POSTs to `/api/discover/search`, which the backend forwards
to the `jobspy` sidecar at `http://jobspy:8001/search`. The sidecar calls
`jobspy.scrape_jobs(...)`, flattens the pandas DataFrame into JSON, and caches
the result keyed on the normalized (sites, term, location, limit, hours, remote,
job-type) tuple for `JOBSPY_CACHE_TTL` seconds (default 600).

```
POST /api/discover/search
{
  "sites": ["linkedin", "indeed"],
  "searchTerm": "senior backend engineer",
  "location": "Berlin",
  "resultsWanted": 25,
  "hoursOld": 72,
  "isRemote": true,
  "jobType": "fulltime"
}
```

Saving a row calls `/api/discover/import`, which upserts on
`(source, sourceJobId)`. Re-importing the same row refreshes
URL/salary/location/description but never overwrites your status or notes.

### LinkedIn rate-limit caveat

From [python-jobspy's README](https://github.com/speedyapply/JobSpy#frequently-asked-questions):

> LinkedIn is the most restrictive: rate-limits hit around the 10th page per IP.

If you plan to query LinkedIn heavily, set `JOBSPY_PROXIES` in `.env` to a
comma-separated list of `host:port` (or `user:pass@host:port`) entries:

```
JOBSPY_PROXIES=user:pass@proxy1.example.com:8080,user:pass@proxy2.example.com:8080
```

JobSpy will rotate through them. For light use the 10-minute query cache built
into the sidecar is usually enough.

---

## Development without Docker

If you want hot-reload while editing:

```sh
# postgres + jobspy via compose, backend + frontend on the host
docker compose up db jobspy

# backend
cd backend
npm install
DATABASE_URL=postgresql://jobtrail:jobtrail@localhost:5432/jobtrail JOBSPY_URL=http://localhost:8001 \
  npx prisma migrate deploy
npm run start:dev

# frontend (separate terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

(That requires exposing port 5432 on the `db` service and 8001 on `jobspy` in a
local override — not done by default for security.)

---

## Tests

```sh
# backend
cd backend && npm test

# frontend
cd frontend && npm test
```

Backend has Jest unit specs for:

- `JobsService` (CRUD, status-event auto-logging, auto-link to Company on create)
- `RoundsService`, `SkillsService` (`findSkillInContext` against tricky cases: `react` vs `reacted`, `go` vs `google`, `c++` with its punctuation)
- `DiscoverService` (delegates to JobsService, gates company resolution on `auto` status, skips `confirmed` / `rejected`)
- `CompaniesService` (domain match, normalized-name match, Jaro-Winkler fuzzy fallback, short-name skip)
- `name-normalizer` (Chevron-variants collapse, AT&T preserved, idempotency)
- `EnrichmentService` (first-wins merge, per-field provenance, per-source error isolation)
- `WikipediaSource`, `WikidataSource`, `EdgarSource`, `EdgarTickerCache` (each with mocked-HTTP fixtures covering happy path + the source-specific edge cases)

Frontend has a Vitest + Testing Library smoke test on `DeadlineBadge`.

---


## Deploying to a homelab with Portainer + Cloudflare Tunnel

JobTrail ships a second compose file, `docker-compose.portainer.yml`, tuned for
a Git-based Portainer stack with [cloudflared](https://github.com/cloudflare/cloudflared)
in front. The browser only sees one origin (your Cloudflare hostname); the
frontend's nginx reverse-proxies `/api/*` to the backend container over the
compose network, so there's no CORS, no exposed backend port, and no TLS for
you to terminate.

### 1. Cloudflare Tunnel — add a Public Hostname

In the Cloudflare Zero Trust dashboard, on the tunnel that runs on your
homelab:

- **Subdomain / Domain**: e.g. `jobtrail` / `yourdomain.com`
- **Service type**: `HTTP`
- **URL**: `<homelab-ip>:3000` (or whatever you set `JOBTRAIL_FRONTEND_PORT` to)

That's the only mapping needed — everything else is internal to the compose
network.

### 2. Portainer — create the stack

In Portainer: **Stacks → Add stack → Git repository**.

| Field                | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| Name                 | `jobtrail`                                                   |
| Repository URL       | `https://github.com/kaylaehman/jobtrail`                     |
| Repository reference | `refs/heads/main`                                            |
| Compose path         | `docker-compose.portainer.yml`                               |
| Enable auto-update   | optional — polls the repo and redeploys on commits           |

### 3. Set stack environment variables

In the **Environment variables** section of the stack form:

| Var                       | Required? | Notes                                                       |
| ------------------------- | --------- | ----------------------------------------------------------- |
| `POSTGRES_PASSWORD`       | yes       | The compose file errors out if this isn't set.              |
| `JOBSPY_PROXIES`          | optional  | Comma-sep proxy list for python-jobspy, per LinkedIn caveat. |
| `JOBTRAIL_FRONTEND_PORT`  | optional  | Default `3000`. Must match the URL in your Cloudflare Tunnel mapping. |
| `JOBTRAIL_CONTACT_EMAIL`  | optional  | Pre-seeds the contact email used in SEC EDGAR's `User-Agent`. UI-side **Settings → Contact email** always overrides this; the env var only matters if you want EDGAR enrichment to work the very first time the stack boots, before any user has visited Settings. |
| `POSTGRES_USER`           | optional  | Default `jobtrail`.                                         |
| `POSTGRES_DB`             | optional  | Default `jobtrail`.                                         |
| `JOBSPY_CACHE_TTL`        | optional  | Default `600` seconds.                                      |
| `JOBTRAIL_IMAGE_NAMESPACE`| optional  | Docker Hub user/org that owns the published images. Default `kaylaehman`. Change if you forked and republish under your own account. |
| `JOBTRAIL_IMAGE_TAG`      | optional  | Default `latest`. Pin to a `sha-<commit>` tag to roll back. |

Click **Deploy the stack**. The Portainer compose file references pre-built
multi-arch images from Docker Hub (`kaylaehman/jobtrail-{backend,frontend,jobspy}`),
so the first deploy just **pulls** rather than building from source — typically
under a minute. The images themselves are produced by the `.github/workflows/docker-publish.yml`
GitHub Action on every push to `main`.

If you've forked the repo and want to publish under your own Docker Hub account:

1. Create a Docker Hub access token with **Read+Write** scope at <https://hub.docker.com/settings/security>.
2. Add two GitHub secrets to your fork (Settings → Secrets and variables → Actions):
   - `DOCKERHUB_USERNAME` — your Docker Hub handle
   - `DOCKERHUB_TOKEN` — the token from step 1
3. Push any change to `main` to trigger the workflow. After it succeeds, three repositories appear under your Docker Hub account.
4. Set `JOBTRAIL_IMAGE_NAMESPACE=<your-handle>` in the Portainer stack env vars.

### 4. Verify

- Visit `https://jobtrail.yourdomain.com` — the dashboard loads, three seeded
  applications are visible, and the **Discover** tab can hit JobSpy.
- Portainer's per-container logs should show `prisma migrate deploy` completing
  and `[jobtrail-backend] listening on :8000`.

### Cloudflared in the same Docker stack (optional)

If cloudflared already runs as a container on this host, you can drop the
host-port binding and put both stacks on a shared docker network. The bottom of
`docker-compose.portainer.yml` has a commented block showing how — point the
tunnel at `http://frontend:80` instead of `http://<homelab-ip>:3000`.

---

## License

MIT.
