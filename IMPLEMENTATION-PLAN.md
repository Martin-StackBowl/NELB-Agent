# NELB — Implementation Plan

Orchestrated build order for the NELB reasoning agent, structured for hackathon delivery with clear dependencies, milestones, and a demo-readiness path.

---

## Guiding principles

- **Demo-first**: Every phase produces something testable or demonstrable. No invisible progress.
- **Highest-risk early**: Azure AI Foundry + Semantic Kernel integration is validated in Phase 2, not saved for last.
- **Backend before frontend**: The frontend is a consumer of the API. Build the API first, then connect the UI.
- **Database is the foundation**: Nothing works without the schema. It goes first.

---

## Phase 0 — Project scaffolding & local environment

**Goal:** Both projects initialised, Docker running, database accessible locally.

| Task | Details | Depends on |
|------|---------|------------|
| 0.1 | Initialise backend: FastAPI project structure, `pyproject.toml`, folder layout (`app/`, `app/services/`, `app/models/`, `app/routes/`, `app/agent/`) | — |
| 0.2 | Initialise frontend: `create-next-app` with TypeScript + Tailwind CSS + App Router | — |
| 0.3 | Create `docker-compose.yml` with FastAPI + PostgreSQL 16 containers | 0.1 |
| 0.4 | Create `.env.example` with all required env vars (no real secrets) | 0.1 |
| 0.5 | Verify `docker-compose up` runs both services, FastAPI responds on `/health` | 0.3 |
| 0.6 | Set up Alembic for migrations, connect to local PostgreSQL | 0.5 |

**Milestone:** `docker-compose up` → FastAPI at `localhost:8000/health` returns `{"status": "ok"}`, PostgreSQL running.

**Estimated time:** 2–3 hours

---

## Phase 1 — Database schema & models

**Goal:** All 6 tables created with seed data. ORM models working.

| Task | Details | Depends on |
|------|---------|------------|
| 1.1 | Define SQLAlchemy models: `Worker`, `Client`, `Job`, `Allocation`, `JobHistory`, `ReasoningLog` | 0.6 |
| 1.2 | Create Alembic migration for initial schema | 1.1 |
| 1.3 | Run migration — verify tables exist in PostgreSQL | 1.2 |
| 1.4 | Create seed data script: 10–15 demo workers (varied skills, locations around Pretoria), 3 demo employers, 5 completed job history records | 1.3 |
| 1.5 | Verify seed data loads correctly with a simple query script | 1.4 |

**Milestone:** `alembic upgrade head` + `python seed.py` → Database populated, queryable via Python.

**Estimated time:** 3–4 hours

---

## Phase 2 — Allocation engine (Brain 1) — the core

**Goal:** The 5-step reasoning pipeline works in isolation with unit tests passing.

| Task | Details | Depends on |
|------|---------|------------|
| 2.1 | Implement skills filter — match job category to worker skills array, partial match for "general repair" (0.7) | 1.1 |
| 2.2 | Implement reliability filter — exclude workers below 50% reliability score | 1.1 |
| 2.3 | Implement availability filter — exclude unavailable workers | 1.1 |
| 2.4 | Implement distance analysis — Haversine formula, linear decay scoring, radius cutoff (default 5km) | 1.1 |
| 2.5 | Implement fairness analysis — query recent 7-day job count, apply penalty above threshold (default 3 jobs) | 1.4 |
| 2.6 | Implement composite scoring — weighted combination (skill 30%, reliability 25%, distance 25%, fairness 20%) | 2.1–2.5 |
| 2.7 | Implement ranking — sort by composite score, return top 5 | 2.6 |
| 2.8 | Implement explanation generator — plain-language reasoning trace for each step | 2.7 |
| 2.9 | Write 9 unit tests (pytest): skills filter, reliability filter, availability, radius, fairness penalty, general repair fallback, composite scoring, top-5 ranking, no-candidate edge case | 2.8 |
| 2.10 | All 9 tests passing | 2.9 |

**Milestone:** `pytest tests/test_allocation.py` → 9 tests pass. Engine takes a job + worker list and returns ranked candidates with reasoning trace.

**Estimated time:** 6–8 hours

---

## Phase 3 — Memory service (Brain 2)

**Goal:** Natural language job history recall working against the database.

| Task | Details | Depends on |
|------|---------|------------|
| 3.1 | Implement intent parser — extract category, time period, client name hints, location hints from a recall query string | 1.4 |
| 3.2 | Implement query builder — construct SQLAlchemy query against `job_history` based on extracted intent | 3.1 |
| 3.3 | Implement response formatter — structured, human-readable answer from query results | 3.2 |
| 3.4 | Test with sample queries: "who did I tile for last year?", "how many cleaning jobs in the last 3 months?", "what was my rating on my last plumbing job?" | 3.3 |

**Milestone:** Memory service takes a natural language query string + worker ID, returns structured answer from real database records.

**Estimated time:** 4–5 hours

---

## Phase 4 — API routes

**Goal:** Three agent endpoints exposed, callable from any HTTP client.

| Task | Details | Depends on |
|------|---------|------------|
| 4.1 | Define Pydantic schemas: `AllocationRequest`, `AllocationResponse`, `RecallRequest`, `RecallResponse`, `AssistRequest`, `AssistResponse` | 2.8, 3.3 |
| 4.2 | Implement `POST /api/agent/allocate` — accepts job details, calls allocation engine, returns top 5 with reasoning trace | 4.1 |
| 4.3 | Implement `POST /api/agent/recall` — accepts query string + worker ID, calls memory service, returns structured answer | 4.1 |
| 4.4 | Implement `POST /api/agent/assist` — accepts question + job context, returns placeholder response (GPT-4o wired in Phase 6) | 4.1 |
| 4.5 | Add structured logging (structlog) to all three routes | 4.2–4.4 |
| 4.6 | Test all endpoints with HTTPie / curl / Postman against seed data | 4.5 |

**Milestone:** All three endpoints respond correctly. `/allocate` returns ranked workers with reasoning. `/recall` returns job history. `/assist` returns a placeholder.

**Estimated time:** 4–5 hours

---

## Phase 5 — Frontend core

**Goal:** Employer and worker interfaces functional, calling real API endpoints.

| Task | Details | Depends on |
|------|---------|------------|
| 5.1 | Set up project structure: layouts, pages (home, employer dashboard, worker dashboard, job post, NELB chat) | 0.2 |
| 5.2 | Set up Zustand stores: job store, worker session store, reasoning trace store, chat history store | 5.1 |
| 5.3 | Build API client layer — typed fetch wrappers for `/allocate`, `/recall`, `/assist` | 4.2–4.4 |
| 5.4 | Build job posting form — category select, description, budget, location picker | 5.1 |
| 5.5 | Integrate React Leaflet — render map with employer pin + radius circle | 5.4 |
| 5.6 | Build worker recommendation panel — display top 5 workers as cards/circles on map, show scores and reasoning | 5.3, 5.5 |
| 5.7 | Build reasoning trace panel — animated step-by-step display of the allocation pipeline results | 5.6 |
| 5.8 | Build NELB chat interface — used for both memory recall (worker) and work assistant (worker) | 5.3 |
| 5.9 | Build worker profile view — skills, ratings, job history summary | 5.3 |
| 5.10 | Connect employer flow end-to-end: post job → see map → see recommendations → view reasoning | 5.4–5.7 |

**Milestone:** Employer can post a job, see the map with radius and worker pins, view the reasoning panel with scores. Worker can use the chat interface.

**Estimated time:** 10–14 hours

---

## Phase 6 — Azure AI Foundry + Semantic Kernel integration

**Goal:** NELB agent running inside Foundry, all three tools wired via Semantic Kernel.

| Task | Details | Depends on |
|------|---------|------------|
| 6.1 | Create Azure AI Foundry project, deploy GPT-4o model | — (Azure account) |
| 6.2 | Install Semantic Kernel Python SDK, configure kernel with Foundry connection | 6.1 |
| 6.3 | Define `@kernel_function` for `allocate_job` — wraps the allocation engine | 2.8, 6.2 |
| 6.4 | Define `@kernel_function` for `recall_memory` — wraps the memory service | 3.3, 6.2 |
| 6.5 | Define `@kernel_function` for `work_assist` — calls GPT-4o with constrained system prompt + job context | 6.2 |
| 6.6 | Wire the agent into the FastAPI routes — replace direct service calls with Semantic Kernel agent invocations | 4.2–4.4, 6.3–6.5 |
| 6.7 | Implement the assistant brain's constrained system prompt — civilian job categories only, refuses licensed work queries | 6.5 |
| 6.8 | Test full agent loop: job allocation via Foundry, memory recall via Foundry, work assist via GPT-4o | 6.6 |
| 6.9 | Implement reasoning log persistence — write every agent decision to `reasoning_logs` table | 6.8 |

**Milestone:** All three brains working through Azure AI Foundry. Agent calls are traced, logged, and persisted.

**Estimated time:** 8–10 hours

**Risk note:** This is the highest-risk phase. Foundry SDK, agent configuration, and model deployment may have friction. Start early, validate connectivity first before wiring everything.

---

## Phase 7 — Auth & user management

**Goal:** Employers and workers can register, log in, and access their respective dashboards.

| Task | Details | Depends on |
|------|---------|------------|
| 7.1 | Set up Supabase project, configure auth providers (email/password) | — |
| 7.2 | Integrate Supabase Auth in Next.js — login/register pages, session handling | 7.1, 5.1 |
| 7.3 | Add JWT validation middleware to FastAPI — verify Supabase JWT on every API request | 7.1, 4.2 |
| 7.4 | Implement role detection — determine if caller is worker or employer from JWT claims | 7.3 |
| 7.5 | Protect routes — employer endpoints require employer role, worker endpoints require worker role | 7.4 |
| 7.6 | Worker registration flow — skills selection, location, availability | 7.2 |
| 7.7 | Employer registration flow — basic profile, location | 7.2 |

**Milestone:** Users can register as worker or employer, log in, and access protected features. API rejects unauthenticated requests.

**Estimated time:** 5–6 hours

---

## Phase 8 — Azure Maps integration

**Goal:** Real distance and travel time data replacing Haversine-only calculations.

| Task | Details | Depends on |
|------|---------|------------|
| 8.1 | Create Azure Maps account, get API key, store in Key Vault | — |
| 8.2 | Implement Azure Maps client in backend — route distance and travel time API calls | 8.1 |
| 8.3 | Wire into allocation engine Step 4 — after Haversine pre-filter, call Azure Maps for shortlisted candidates | 2.4, 8.2 |
| 8.4 | Add travel time to reasoning trace output | 8.3 |
| 8.5 | (Optional) Use Azure Maps tiles on frontend instead of OpenStreetMap | 8.1 |

**Milestone:** Allocation engine uses real travel time data for distance scoring. Reasoning trace includes travel estimates.

**Estimated time:** 3–4 hours

---

## Phase 9 — Polish, deployment & demo prep

**Goal:** Deployed, demo-ready, submission-complete.

| Task | Details | Depends on |
|------|---------|------------|
| 9.1 | Deploy backend to Azure App Service | All backend phases |
| 9.2 | Deploy frontend to Vercel | All frontend phases |
| 9.3 | Configure production environment variables (Key Vault secrets, Supabase prod, Foundry connection) | 9.1, 9.2 |
| 9.4 | End-to-end smoke test on production URLs | 9.3 |
| 9.5 | Write README.md with Mermaid architecture diagram, setup instructions, live URLs | 9.4 |
| 9.6 | Record 5-minute demo video following the script in the system statement | 9.4 |
| 9.7 | Final repo cleanup — remove debug code, verify `.env.example`, confirm no secrets in code | 9.5 |
| 9.8 | Submit: public repo URL + demo video + project description | 9.6, 9.7 |

**Milestone:** Live demo at Vercel URL + Azure App Service. Video recorded. Repo public. Submission complete.

**Estimated time:** 5–6 hours

---

## Parallel tracks

Some phases can run simultaneously:

```
Phase 0 ─────► Phase 1 ─────► Phase 2 ─────► Phase 4 ─────► Phase 6
                                  │                              │
                                  ├──► Phase 3 ─────────────────►│
                                  │                              │
Phase 0 (frontend) ──► Phase 5 (can start after Phase 4 APIs exist) ──► Phase 7
                                                                          │
Phase 6.1 (Foundry setup) can start independently ◄────────────────────────┘
                                                                          │
Phase 8 (Azure Maps) can start after Phase 2 ◄────────────────────────────┘
```

**Key parallelism:**
- Frontend scaffolding (Phase 5.1–5.2) can happen while backend Phases 2–4 are in progress
- Azure AI Foundry project creation (Phase 6.1) can happen any time — do it early to catch issues
- Azure Maps setup (Phase 8.1) can happen any time

---

## Critical path (demo-readiness)

The minimum viable demo path — what must work for the video:

```
Phase 0 → Phase 1 → Phase 2 → Phase 4.2 → Phase 5 (core) → Phase 6 → Phase 9.6
```

That gives you:
- Employer posts job → map with radius → 5 ranked workers → reasoning panel (Scenes 2 & 3)
- Worker recalls memory → structured answer (Scene 4)
- Worker asks assistant → practical answer (Scene 5)

Everything else (auth, Azure Maps precision, deployment polish) enhances but isn't required for the demo recording.

---

## Total estimated time

| Phase | Hours |
|-------|-------|
| Phase 0 — Scaffolding | 2–3 |
| Phase 1 — Database | 3–4 |
| Phase 2 — Allocation engine | 6–8 |
| Phase 3 — Memory service | 4–5 |
| Phase 4 — API routes | 4–5 |
| Phase 5 — Frontend | 10–14 |
| Phase 6 — Foundry + SK | 8–10 |
| Phase 7 — Auth | 5–6 |
| Phase 8 — Azure Maps | 3–4 |
| Phase 9 — Deploy & demo | 5–6 |
| **Total** | **50–65 hours** |

With parallelism and focused execution, this is achievable in **7–10 working days** for a solo developer, or **4–5 days** with a second person handling the frontend.

---

## Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Azure AI Foundry SDK issues / breaking changes | High — blocks Phase 6 entirely | Start Phase 6.1 early. Validate "hello world" agent before wiring real logic. |
| Semantic Kernel Python SDK version mismatch | Medium — unexpected API changes | Pin exact version in `pyproject.toml`. Test tool registration in isolation first. |
| Azure Maps API quota / key provisioning delay | Low — can demo without it | Haversine formula works standalone. Azure Maps adds precision but isn't blocking. |
| Supabase Auth JWT validation edge cases | Low — can demo without auth | Implement auth last. Demo can run without login if needed. |
| Demo video recording issues | Medium — submission requires video | Write script first, rehearse once, then record. Don't leave this for the last hour. |

---

*This plan is a living document. Update phase statuses as work progresses.*
