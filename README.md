# JobTrail

![JobTrail — Track. Discover. Land.](./jobtrail-banner.png)

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

## Decisions

The spec leaves some choices open; here is what JobTrail's MVP committed to.

- **Skill matcher** (`backend/src/skills/skills.service.ts`) uses alphanumeric
  lookaround regex (`(?<![A-Za-z0-9])skill(?![A-Za-z0-9])`) instead of `\b`.
  Word boundaries can't bracket skills like `c++` or `node.js` because `+` and
  `.` aren't word chars; asserting non-alphanumeric neighbors gives the same
  semantics for `react` while leaving punctuation-bearing skills alone.
- **Timeline visual style**: ASCII-fidelity tree (├ / └ in a monospaced font)
  to match REQUIREMENTS.md §8.2 character-for-character.
- **Deadline urgency**: two tiers — amber ≤7 days, red overdue. No 3-day red
  tier; the MVP optimizes for low visual noise.
- **Re-import behavior**: `(source, source_job_id)` upserts refresh
  URL/salary/location/description but never overwrite the user's status or
  notes. Manual entries (`source = 'manual'`) never dedupe.
- **Migrations**: `prisma migrate deploy` runs in the backend entrypoint. The
  initial migration is hand-written so a clean Postgres comes up without
  needing `migrate dev`.
- **JobSpy cache**: in-memory TTLCache only (resets on container restart).
  Cross-restart caching would mean adding Redis, which is out of scope.
- **No auth**: single-user local deployment per spec §1.3. Adding auth is a
  Phase 4 / commercial-track concern.

---

## Out of scope (deliberately)

Per the prompt, none of the following are scaffolded:

- multi-user auth / RBAC
- calendar sync (FR-8)
- email parsing (FR-9)
- resume matching (FR-10)
- OpenAI / GPT calls (any phase)
- analytics dashboards (FR-12)

Add them when you actually need them — don't preempt the architecture.

---

## License

MIT.
