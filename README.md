# NELB — No Employee Left Behind

> **Microsoft Agents League @ AI Skills Fest 2026 — Reasoning Agents Track**
> Azure AI Foundry · Foundry IQ · GitHub Copilot

NELB is a reasoning agent for fair job distribution in community-level gig economies. You talk to it in plain language; it works out what you need, reasons through the decision, and explains every step.

---

## The problem

In informal and community labour markets — especially across the Global South — work is distributed unfairly. A well-connected few capture most of the jobs while skilled people with no visibility are left behind. Employers can't reliably find vetted, nearby workers. Workers have no memory of their own history and no one to help them do a job correctly on site. And nobody can see *why* a worker was chosen — allocation is a black box, so it can't be trusted or audited.

NELB addresses all of this in a single agent.

---

## The core idea: one conversation, four brains

NELB looks like one chat. Underneath, it's a coordinated system that **reasons about your intent first, then routes to the right specialist** — and shows its work the whole way.

When you send a message, NELB's orchestrator (running on Azure AI Foundry) reads it, understands what you're actually trying to do, extracts the details, and hands off to one of four brains:

| You ask… | NELB routes to… | What happens |
|----------|-----------------|--------------|
| "Find me a painter, budget R1200" | **Allocation Brain** | Ranks workers through a transparent multi-step pipeline |
| "Who did I work for last month?" | **Memory Brain** | Recalls your own job history |
| "How many bags of cement for this slab?" | **Work Assistant** | Answers from a cited knowledge base (Foundry IQ) |
| "What's my reliability score?" | **Profile Brain** | Reads your profile and stats |

You never pick a tool or change pages. Three messages in the same chat can fire three different brains — the agent decides. That routing decision is itself a reasoning step, and it's what makes NELB feel like one intelligent companion rather than four separate features.

**The design principle:** the language model is used for what language models are genuinely good at — understanding intent and explaining outcomes in plain words. The decision that actually matters — *who gets the work* — is handled by transparent, deterministic logic that produces the same answer every time and can be audited line by line. Best of both: natural conversation on the surface, accountable reasoning underneath.

---

## Brain 1 — Allocation: reasoning you can see

When a job is posted, NELB doesn't just return the nearest available worker. It narrows the candidate pool one constraint at a time, and every elimination is visible in the reasoning trace:

| Step | What it checks |
|------|----------------|
| Self-exclusion | You can't be matched to your own job |
| Skills | Do they actually do this kind of work? (general-repair fallback is **blocked** for electrical & plumbing — safety first) |
| Reliability | Proven track record, blended with real client ratings |
| Availability | Are they open to work right now? |
| Distance | How far is the worker from the job? |
| Budget fit | Does their typical price for this work fit your budget? |
| Fairness | Have they already had plenty of work recently? |

Workers who clear every step are ranked by a weighted score across five factors — **skill, reliability, distance, fairness, and budget fit** — and the result includes a confidence signal that reflects how clear-cut the top choice really was.

Three things make this stand out:

- **Fairness is built in, not bolted on.** Workers who've already taken several recent jobs are gently penalised so others in the community get a turn. "No employee left behind" is the literal operating rule of the ranking — visible in the trace, not just a slogan.
- **Budget is real reasoning.** Each worker's expected price is grounded in their actual earning history for that kind of job. Being cheaper never scores higher — NELB protects worker income instead of driving a race to the bottom. Ask for a painter at an unrealistic budget and NELB honestly tells you no one fits, rather than returning a bad match.
- **Reputation counts.** A higher-rated worker outranks an equally reliable but lower-rated one. Newcomers aren't punished for having no ratings yet.

Every recommendation comes with a plain-language explanation of *why the top worker was chosen over the runner-up* — and that explanation is backed by a cited source from the knowledge base.

---

## Brain 2 — Memory: your work history, in plain language

Workers ask about their own past work and get a real answer:

- *"Who did I tile a kitchen for last year?"*
- *"How many cleaning jobs did I do in the last 3 months?"*
- *"What was my rating on the last plumbing job?"*

NELB understands the question, looks it up, and answers conversationally. The same history also feeds the fairness engine — so memory and allocation reinforce each other.

---

## Brain 3 — Work Assistant: grounded by Foundry IQ

A practical, on-site buddy for tools, materials, safety, and calculations:

- *"Which drill bit for a 6mm wall plug in brick?"*
- *"How many bags of cement for a 3m × 4m slab at 100mm?"*
- *"What ladder angle is safe when working at height?"*

Answers are **grounded by Foundry IQ** — retrieved from a curated knowledge base and returned with inline citations to the exact source. If the knowledge base doesn't contain the answer, NELB says so rather than guessing. It also refuses anything outside safe civilian work (licensed high-voltage electrical, gas fitting, structural work).

This is the heart of the required Foundry IQ integration: the knowledge base is a **purpose-built corpus for community trade work**, not a generic web scrape. It even contains NELB's own allocation criteria — so when someone asks *"why does NELB penalise workers with too many recent jobs?"*, the cited answer comes straight from that grounded source. The citation is the proof that the answer is real, not invented.

**Knowledge base coverage (indexed in Azure AI Search):** drill bits & fasteners · cement & concrete · tiling · painting · basic electrical · basic plumbing · carpentry · ladder safety · chemical safety · cleaning · gardening · moving & lifting · general repairs · NELB allocation criteria.

---

## Why this is a *reasoning* agent

NELB demonstrates multi-step reasoning at two levels:

1. **Understanding & routing** — the agent interprets natural language, classifies intent, extracts structured details, and chooses the right capability. It carries context across a conversation, so "I need a cleaner" followed by "R3000" is understood as one continuous request.
2. **Deciding & explaining** — the allocation pipeline works through its constraints in sequence, records what happened at each step, and produces a transparent, repeatable result with a grounded explanation.

Nothing important is a black box, and nothing important is left to chance.

---

## Job categories

NELB operates only in low-to-mid-risk civilian work — a deliberate choice for safety and trust:

`cleaning` · `gardening` · `painting` · `plumbing` · `electrical` · `tiling` · `carpentry` · `moving` · `general repair`

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Reasoning agent | **Azure AI Foundry** (o4-mini orchestrator) |
| Required IQ layer | **Foundry IQ** — grounded retrieval via Azure AI Search, with citations |
| Grounded answers | GPT-4o-mini via Azure AI Foundry |
| Backend | FastAPI · Python 3.11 · Pydantic v2 · SQLAlchemy async |
| Database | PostgreSQL 16 |
| Frontend | Next.js 15 · TypeScript · Tailwind CSS v4 · Zustand · React Leaflet |
| AI-assisted development | GitHub Copilot |
| Local environment | Docker Compose |

See `ARCHITECTURE.md` for the full system diagram.

---

## Running locally

**Prerequisites:** Docker Desktop · Node.js 20+ · Python 3.11+

**1. Database** (from the project root):
```bash
docker compose up -d db          # starts PostgreSQL 16
```

**2. Backend** (from `backend/`):
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -e ".[dev]"          # install dependencies
python seed.py                    # create + populate demo data (safe to re-run)
python -m uvicorn app.main:app --reload --port 8000
```

**3. Frontend** (from `frontend/`, in a second terminal):
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

### Configuration & what runs without it

The database connection works out of the box against the Docker container (no `.env` required for the DB).

To enable the Azure-powered features, copy `backend/.env.example` to `backend/.env` and add your **Azure AI Foundry** and **Azure AI Search** credentials.

| Feature | Works without Azure keys? |
|---------|---------------------------|
| **Find Workers** — full 6-step allocation, reasoning trace, scoring | ✅ Yes (pure Python) |
| Memory recall (direct) | ✅ Yes |
| **Talk to NELB** — the unified agent / brain-switching | ❌ Needs Azure AI Foundry (o4-mini) |
| **Work Assistant** — Foundry IQ grounded, cited answers | ❌ Needs Azure AI Foundry + Azure AI Search |
| Allocation decisive-factor enrichment (citations) | ❌ Needs Foundry IQ |

> Without credentials, you can still run and inspect the deterministic allocation engine end-to-end. The full agent experience (brain-switching, grounded citations) is shown in the demo video and requires Azure resources to reproduce live.

---

## Demo guide

**Demo accounts** (from the Login button — explore NELB as a worker):

| Name | Skills |
|------|--------|
| Thabo Mabena | Painting, Tiling, General repair |
| Sarah Mokoena | Cleaning, Gardening |
| James Moyo | Carpentry, Tiling, Painting |

**Demo zone — Pretoria, South Africa.** The seeded worker community is in the Pretoria metro. If a search returns no workers, your map pin is outside the zone — use the editable coordinate fields or the **Reset** button to jump back to Pretoria CBD (`-25.7463, 28.1885`).

**A 60-second tour:**
1. **Find Workers** → painting, budget **R5000** → watch the reasoning trace narrow the pool and explain the winner.
2. Repeat at budget **R500** → NELB honestly returns no match (below market). Raise it again → the shortlist returns.
3. **Talk to NELB** → send three messages and watch the brain switch:
   - `I need a cleaner for my house, budget R600` → Allocation Brain
   - `Who did I paint for?` (logged in as Thabo) → Memory Brain
   - `How many bags of cement for a 3m x 4m slab at 100mm?` → Work Assistant, with a citation

---

## Tested & verifiable

The allocation engine is covered by a unit-test suite (skills filtering, safety-critical blocking, reliability threshold, fairness penalty, rating blend, budget fit, distance decay, confidence). Run it with:

```bash
cd backend
python -m pytest tests/test_allocation.py -v
```

---

## Design principles

1. **Fairness is structural, not aspirational** — it's enforced in the ranking, not promised in a mission statement.
2. **Explainability is mandatory** — every decision ships with a reasoning trace.
3. **Safety is enforced** — unqualified workers can't be matched to electrical or plumbing work; unsafe questions are refused.
4. **Grounded, not guessed** — the assistant cites its sources via Foundry IQ.
5. **Real history matters** — ratings and earnings feed back into allocation.
6. **Confidence must mean something** — it reflects how clear the top choice was, not just its score.
7. **No employee left behind** — the operating principle behind every part of the system.

---

*Built for the Microsoft Agents League @ AI Skills Fest 2026 — Reasoning Agents track.*
*Azure AI Foundry · Foundry IQ · GitHub Copilot*
