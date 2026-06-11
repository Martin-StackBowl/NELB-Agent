# NELB — Implementation Plan

Orchestrated build order for the NELB reasoning agent, structured for hackathon delivery.

**Deadline: June 14, 2026** (4 days from today, June 10)

---

## Guiding principles

- **Demo-first**: Every phase produces something testable or demonstrable. No invisible progress.
- **Highest-risk early**: Azure AI Foundry + Foundry IQ integration is validated early — not saved for last.
- **Backend before frontend**: The frontend consumes the API. Build the API first, then connect the UI.
- **Database is the foundation**: Nothing works without the schema. It goes first.

---

## Current status (June 10)

- ✅ Phase 0 — Project scaffolding complete
- ✅ Phase 1 — Database models defined, seed script written
- ✅ Phase 2 — Allocation engine implemented (Brain 1)
- ✅ Phase 3 — Memory service implemented (Brain 2)
- ✅ Phase 4 — API routes implemented
- ✅ Phase 5 — Frontend core scaffolded
- 🔄 Running locally — PostgreSQL via Docker running, backend deps installed, next step: `python seed.py`
- ⬜ Phase 6 — Azure AI Foundry + Semantic Kernel + Foundry IQ
- ⬜ Phase 7 — Auth (Supabase)
- ⬜ Phase 8 — Azure Maps
- ⬜ Phase 9 — Deploy & demo

---

## Remaining timeline (4 days)

| Day | Focus | Outcome |
|-----|-------|---------|
| June 10 (today) | Get backend + frontend running end-to-end locally. Test all 3 endpoints. | Working local demo |
| June 11 | Phase 6 — Azure AI Foundry + Semantic Kernel + Foundry IQ knowledge store | Agent wired, Brain 3 grounded |
| June 12 | Frontend polish (map, reasoning panel animation, cited sources display). Phase 7 auth if time permits. | Demo-ready UI |
| June 13 | Deploy to Azure App Service + Vercel. Record demo video. Final README. | Submission-ready |
| June 14 | Buffer day — fix any issues, submit before deadline | Submitted |

---

## Phase 0 — Project scaffolding & local environment ✅

**Status: COMPLETE**

- FastAPI project structure with all folders
- Next.js frontend with TypeScript + Tailwind v4
- Docker Compose with PostgreSQL 16
- `.env.example` with all required env vars
- Alembic configured for async migrations

---

## Phase 1 — Database schema & models ✅

**Status: COMPLETE**

- 6 SQLAlchemy models: Worker, Client, Job, Allocation, JobHistory, ReasoningLog
- Seed script with 12 demo workers, 3 employers, 5 job history records (Pretoria area)
- `python seed.py` creates tables and populates data

---

## Phase 2 — Allocation engine (Brain 1) ✅

**Status: COMPLETE**

- Full 5-step reasoning pipeline implemented in `app/services/allocation/engine.py`
- Haversine distance calculation
- Composite scoring (skill 30%, reliability 25%, distance 25%, fairness 20%)
- Top 5 ranking with full reasoning trace
- 9 unit tests in `tests/test_allocation.py`

---

## Phase 3 — Memory service (Brain 2) ✅

**Status: COMPLETE**

- Intent parser extracts category, time period, client hints from natural language queries
- Dynamic SQLAlchemy query builder against job_history table
- Structured response formatter

---

## Phase 4 — API routes ✅

**Status: COMPLETE**

- `POST /api/agent/allocate` — Brain 1
- `POST /api/agent/recall` — Brain 2
- `POST /api/agent/assist` — Brain 3 (placeholder, wired in Phase 6)
- Pydantic v2 request/response schemas
- Health check endpoint

---

## Phase 5 — Frontend core ✅

**Status: COMPLETE (scaffold)**

- Home page with employer/worker entry points
- Employer flow: job posting form → reasoning trace panel → ranked recommendations
- Worker flow: chat interface with memory recall / work assistant toggle
- Zustand stores for both flows
- Typed API client for all 3 endpoints
- Tailwind v4 with NELB brand colours

---

## Phase 6 — Azure AI Foundry + Semantic Kernel + Foundry IQ

**Goal:** NELB agent running inside Foundry, all three tools wired, Brain 3 grounded by Foundry IQ.

| Task | Details | Depends on |
|------|---------|------------|
| 6.1 | Create Azure AI Foundry project in Azure Portal | Azure account |
| 6.2 | Deploy GPT-4o model inside the Foundry project | 6.1 |
| 6.3 | Create Foundry IQ knowledge store | 6.1 |
| 6.4 | Index knowledge documents into Foundry IQ: tool guides, material references, safety guidelines | 6.3 |
| 6.5 | Install Semantic Kernel Python SDK, configure kernel with Foundry connection | 6.2 |
| 6.6 | Define `@kernel_function` for `allocate_job` — wraps the allocation engine | 6.5 |
| 6.7 | Define `@kernel_function` for `recall_memory` — wraps the memory service | 6.5 |
| 6.8 | Define `@kernel_function` for `work_assist` — queries Foundry IQ, then GPT-4o with grounded context | 6.4, 6.5 |
| 6.9 | Wire the agent into FastAPI routes — replace direct service calls with Semantic Kernel agent invocations | 6.6–6.8 |
| 6.10 | Implement cited source display in assistant response schema | 6.8 |
| 6.11 | Test full agent loop: allocation via Foundry, memory via Foundry, assist via Foundry IQ + GPT-4o | 6.9 |
| 6.12 | Persist reasoning logs to `reasoning_logs` table | 6.11 |

**Milestone:** All three brains working through Azure AI Foundry. Brain 3 returns cited, grounded answers from Foundry IQ. Agent calls traced and logged.

**Estimated time:** 8–10 hours

**Risk note:** Highest-risk phase. Foundry IQ setup, knowledge store indexing, and Semantic Kernel wiring may have friction. Validate connectivity first before wiring logic.

**Keys needed:**
- Azure AI Foundry endpoint + API key (Azure Portal → AI Foundry → Keys and Endpoint)
- Foundry IQ is configured within the same Foundry project

---

## Phase 7 — Auth (Supabase)

**Goal:** Users can register and log in. API validates JWTs.

| Task | Details | Depends on |
|------|---------|------------|
| 7.1 | Create Supabase project, configure email/password auth | — |
| 7.2 | Integrate Supabase Auth in Next.js — login/register pages | 7.1 |
| 7.3 | Add JWT validation middleware to FastAPI | 7.1 |
| 7.4 | Worker/employer registration flows | 7.2 |

**Estimated time:** 5–6 hours

**Priority: LOW for demo.** The demo can run without auth. Only implement if time allows after Phase 6 and frontend polish are complete.

**Key needed:** Supabase URL + JWT secret (supabase.com → project → Settings → API)

---

## Phase 8 — Azure Maps

**Goal:** Real travel time data in allocation engine.

| Task | Details | Depends on |
|------|---------|------------|
| 8.1 | Create Azure Maps account, get API key | Azure account |
| 8.2 | Implement Azure Maps client — route distance and travel time | 8.1 |
| 8.3 | Wire into allocation engine Step 4 after Haversine pre-filter | 8.2 |

**Estimated time:** 3–4 hours

**Priority: LOW for demo.** Haversine formula already works. Azure Maps adds precision but isn't required for a working demo.

**Key needed:** Azure Maps subscription key (Azure Portal → Azure Maps → Authentication → Primary Key)

---

## Phase 9 — Deploy, polish & submit

**Goal:** Live demo, video recorded, repo submitted.

| Task | Details | Depends on |
|------|---------|------------|
| 9.1 | Deploy backend to Azure App Service | Phase 6 complete |
| 9.2 | Deploy frontend to Vercel | Phase 5 complete |
| 9.3 | Configure production env vars (Key Vault, Supabase, Foundry) | 9.1, 9.2 |
| 9.4 | End-to-end smoke test on production URLs | 9.3 |
| 9.5 | Frontend polish: map animation, reasoning panel step-by-step animation, cited sources display | — |
| 9.6 | Write final README.md with architecture diagram, setup instructions, live URLs | 9.4 |
| 9.7 | Record 5-minute demo video following the script in the system statement | 9.4 |
| 9.8 | Final repo cleanup — no secrets, `.env.example` correct, public repo | 9.6 |
| 9.9 | Submit: public repo URL + demo video + project description | 9.7, 9.8 |

**Estimated time:** 5–6 hours

---

## Critical path (minimum for submission)

```
Local running (today) → Phase 6 (Foundry + IQ) → Frontend polish → Deploy → Demo video → Submit
```

What must work for the demo:
1. Employer posts job → map with radius → 5 ranked workers → reasoning panel (Scenes 2 & 3)
2. Worker recalls memory → structured answer (Scene 4)
3. Worker asks assistant → cited, grounded answer from Foundry IQ (Scene 5)

**What can be cut if time runs out:**
- Auth (Phase 7) — demo runs without login
- Azure Maps (Phase 8) — Haversine works fine
- Production deployment — can demo from localhost if needed (but live URL is much better for judges)

---

## Keys & accounts summary

| Service | When needed | How to get |
|---------|-------------|------------|
| Azure account | Phase 6 | portal.azure.com — free tier or pay-as-you-go |
| Azure AI Foundry endpoint + key | Phase 6 | Azure Portal → AI Foundry → project → Keys and Endpoint |
| Foundry IQ knowledge store | Phase 6 | Configured within same Foundry project |
| Azure Maps key | Phase 8 (optional) | Azure Portal → Azure Maps → Authentication |
| Supabase URL + JWT secret | Phase 7 (optional) | supabase.com → project → Settings → API |
| Vercel account | Phase 9 | vercel.com — free tier |

---

## Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Foundry IQ setup complexity / docs unclear | High — blocks Brain 3 grounding | Start Phase 6.3 early. Validate with a test query before full integration. |
| Semantic Kernel Python SDK version issues | Medium — unexpected API changes | Pin exact version. Test tool registration in isolation. |
| Azure Maps quota / provisioning delay | Low — can demo without it | Haversine works standalone. Azure Maps is a nice-to-have. |
| Knowledge store indexing takes too long | Medium — blocks cited answers | Prepare documents in advance. Start indexing before coding the integration. |
| Demo video quality / recording issues | Medium — required for submission | Script is written. Rehearse once, then record. Don't save for last hour. |
| Time pressure (4 days remaining) | High — incomplete submission | Focus on critical path only. Cut auth and Azure Maps if needed. |

---

*Updated: June 10, 2026. This plan reflects the V3 system statement with Foundry IQ integration.*
