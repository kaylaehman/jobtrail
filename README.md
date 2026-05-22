# JobTrail

![JobTrail — Track. Discover. Land.](./docs/jobtrail-banner.png)

A self-hosted job-application tracker with a JobSpy-powered discovery pipeline.

JobTrail implements **Phase 1 of the [AI Job Application Tracker spec](docs/REQUIREMENTS.md)** —
FR-1 through FR-7 (CRUD, multi-round timeline, skills extraction, notes, search,
deadline reminders) plus a one-click **Discover** flow that pulls jobs from
LinkedIn / Indeed / Glassdoor / Google / ZipRecruiter via
[python-jobspy](https://github.com/speedyapply/JobSpy) and saves them into the
tracker.

Everything runs locally behind `docker compose up`. No auth, no external LLM
calls in the MVP.

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

## Run it

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
| FR-5 | Notes & feedback per round         | On the detail page, hover any timeline round → ✏️ Edit → update the Notes textarea → Save.            |
| FR-6 | Search & filter                    | Dashboard top bar: free-text `q`, status dropdown, tag filter.                                         |
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
  "isRemote": true
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

Backend has Jest unit specs for `JobsService`, `RoundsService`,
`DiscoverService`, and `SkillsService`. Frontend has a Vitest + Testing Library
smoke test on `DeadlineBadge`.

`skills.service.spec.ts` covers `findSkillInContext` against the tricky cases:
`react` vs `reacted`, `go` vs `google`, and `c++` with its punctuation.

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
| `POSTGRES_USER`           | optional  | Default `jobtrail`.                                         |
| `POSTGRES_DB`             | optional  | Default `jobtrail`.                                         |
| `JOBSPY_CACHE_TTL`        | optional  | Default `600` seconds.                                      |

Click **Deploy the stack**. The first deploy builds three images on the
homelab host (5–10 minutes); subsequent redeploys are much faster thanks to
Docker layer caching.

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
