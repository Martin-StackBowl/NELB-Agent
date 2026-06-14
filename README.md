# NELB — No Employee Left Behind

> **Microsoft Agents League @ AI Skills Fest 2026 — Reasoning Agents Track**
> Foundry IQ · Azure AI Foundry · Semantic Kernel · GitHub Copilot

NELB is an intelligent reasoning agent for fair job distribution in community-level gig economies. It sits at the intersection of proximity-based matching and a fairness-first philosophy, constrained to civilian job categories to ensure safety and legality.

---

## The problem

In informal labour markets — particularly across the Global South — work distribution is deeply unfair. A well-connected few get most of the jobs. Skilled people with no visibility get left behind. Employers have no reliable way to find vetted, nearby workers. There is no memory of past work. There is no assistant helping a worker do a job better. And no system ensures the work stays fair.

NELB solves all of this in a single, coherent reasoning agent.

---

## How NELB reasons — Brain 1: Allocation Engine

The allocation engine is **pure deterministic Python** — no LLM in the decision path, no randomness. Every run with the same inputs produces the same result, with a full step-by-step trace.

### The 6-step pipeline

| Step | Name | What it does |
|------|------|--------------|
| 0 | Self-exclusion | Removes the posting user from the candidate pool (workers cannot hire themselves) |
| 1 | Skills filter | Exact match scores 1.0. General-repair fallback scores 0.7 — **blocked for electrical and plumbing** (safety-critical categories require specific qualifications) |
| 2 | Reliability filter | Workers below 50% base reliability are eliminated |
| 3 | Availability filter | Workers marked unavailable are excluded |
| 4 | Distance analysis | Haversine distance scored with linear decay within the configured radius |
| 5 | Budget fit | Each worker's expected price (from their job history, or a category baseline × price factor) is compared to the employer's budget. Workers priced >30% over budget are eliminated; within 30% over, score decays linearly |
| 6 | Fairness analysis | Workers who have reached the threshold of recent jobs (default: 3 in 7 days) receive an escalating penalty — reaching the threshold triggers it |

### Composite scoring

Workers who survive all six steps are ranked by a weighted composite score:

| Factor | Weight | Notes |
|--------|--------|-------|
| Skill match | 25% | 1.0 exact, 0.7 general-repair fallback |
| Reliability | 20% | 70% base score + 30% average star rating — earned reputation matters |
| Distance | 20% | Linear decay from 1.0 at 0km to 0.0 at radius boundary |
| Fairness | 20% | Penalises over-allocation to ensure fair community distribution |
| Budget fit | 15% | Grounded in real job history; category baseline for newcomers |

**Total: 100%**

### Reliability composite

```
reliability = 0.70 × (base_score / 100) + 0.30 × (avg_rating / 5.0)
```

A 5-star worker outranks a 3-star worker with the same base reliability score. Workers with no ratings yet are not penalised — their base score is used as-is.

### Budget reasoning

Budget is a **fit signal, not a cheapness signal**. Being far under budget does not improve ranking — this prevents a race to the bottom that would contradict the worker-fairness ethos. The engine uses the worker's average historical payment for the job category when available, falling back to a category baseline rate scaled by the worker's price positioning.

### Confidence signal

```
confidence = margin × pool_factor + winner_score × 0.4
```

Where `margin = (winner - runner_up) / winner` and `pool_factor = min(1.0, pool_size / 5)`. A dominant winner in a large pool earns a higher confidence score than a marginal winner in a pool of two — an honest signal, not a vanity metric.

---

## Brain 2 — Memory Brain

Workers query their own job history in natural language:

- *"Who did I tile a kitchen for last year?"*
- *"How many cleaning jobs did I do in the last 3 months?"*
- *"What was my rating on the last plumbing job?"*

NELB parses intent (category, time period, client hints), queries PostgreSQL, and returns a structured human-readable answer. The Memory Brain also feeds the Allocation Brain — the fairness engine reads from job history to calculate recent job counts.

---

## Brain 3 — Work Assistant (Foundry IQ)

A practical on-site buddy. Workers ask questions about tools, materials, safety, and calculations. Answers are **grounded via Foundry IQ** — retrieved from an indexed knowledge base with cited sources. The assistant answers only from retrieved content; if the knowledge base doesn't contain the answer, it says so.

- *"Which drill bit for a 6mm wall plug in brick?"*
- *"How many bags of cement for a 3m × 4m slab at 100mm depth?"*
- *"What ladder angle is safe when working at height?"*

The assistant is strictly constrained to civilian job categories. It refuses licensed electrical (high-voltage), gas fitting, structural engineering, and any illegal activity.

### Foundry IQ implementation

Brain 3 uses the **Azure OpenAI "On Your Own Data" pattern** — a single API call to the `gpt-4o-mini` deployment with an `azure_search` data source attached:

```
POST /openai/deployments/gpt-4o-mini/chat/completions
{
  "messages": [...],
  "data_sources": [{
    "type": "azure_search",
    "parameters": {
      "endpoint": "<AZURE_SEARCH_ENDPOINT>",
      "index_name": "nelb-trade-guides-index",
      "authentication": { "type": "api_key" }
    }
  }]
}
```

**How it works:**
1. The question arrives at `assist.py`
2. A safety filter blocks dangerous/out-of-scope topics before any API call
3. gpt-4o-mini receives the question alongside chunks retrieved from the Azure AI Search index
4. The model answers using **only** the retrieved content — if the KB doesn't contain the answer, it says so explicitly
5. Citation markers (`[doc1]`, `[doc2]`) are extracted from the response, deduplicated by document title, and returned as structured citation cards rendered in the UI

**Knowledge base — 14 documents indexed in Azure AI Search:**

| Document | Covers |
|----------|--------|
| `drill-bits-and-fasteners.md` | Wall plug/bit matching table, drilling into brick |
| `cement-and-concrete.md` | Mix ratios, quantity calculations (with worked examples) |
| `tiling-guide.md` | Adhesive selection, tile quantity formula, grouting |
| `painting-guide.md` | Coverage calculations, surface prep, drying times |
| `electrical-basics.md` | Low-voltage only — plug wiring (SA colours), bulb changing |
| `plumbing-basics.md` | Dripping taps, drain unblocking, running toilet |
| `carpentry-basics.md` | Wood types, joints, shelf installation, finishing |
| `ladder-safety.md` | 4-to-1 rule, height limits, when not to use a ladder |
| `chemical-safety.md` | Bleach/ammonia hazards, ventilation, PPE |
| `cleaning-guide.md` | Surfaces, products, stain removal, cleaning sequence |
| `gardening-basics.md` | Mowing, hedge trimming, tree branch removal |
| `moving-and-lifting.md` | Safe lifting, packing order, vehicle loading |
| `general-repairs.md` | Wall filling, door/window repairs, silicone sealing |
| `nelb-allocation-criteria.md` | The 6-step pipeline, scoring weights, fairness formula |

**Why this satisfies the Foundry IQ requirement:**
The knowledge base is not a generic web scrape — it is a domain-specific corpus built for NELB's exact use case. The `nelb-allocation-criteria.md` document exists only in this system: when a worker asks "why does NELB penalise workers with too many recent jobs?", the cited answer comes exclusively from this document, not from the model's training weights. The citation is the proof of grounding.

---

## Job categories

NELB operates exclusively in these civilian categories:

`cleaning` · `gardening` · `painting` · `plumbing` · `electrical` · `tiling` · `carpentry` · `moving` · `general repair`

Jobs outside these categories are not permitted. This is a deliberate design decision for risk management and legal compliance — not a limitation.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4 |
| State | Zustand |
| Maps | React Leaflet (CartoDB tiles, dark/light aware) |
| Backend | FastAPI, Python 3.11, Pydantic v2 |
| ORM | SQLAlchemy async + asyncpg |
| Database | PostgreSQL 16 |
| AI Agent | Azure AI Foundry (o4-mini) |
| IQ layer | **Foundry IQ** — grounded knowledge retrieval (required) |
| LLM | GPT-4o via Azure AI Foundry |
| Orchestration | Semantic Kernel (Python SDK) |
| Dev tool | GitHub Copilot |
| Containers | Docker + Docker Compose |

---

## Running locally

### Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.11+ with a virtual environment

### Backend (local venv — fastest)

```bash
cd backend

# Start Postgres only
docker compose up -d db

# Seed the database (drops and recreates tables — safe to re-run)
.venv/Scripts/python.exe seed.py      # Windows
# or
python seed.py                         # macOS/Linux

# Start the API
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

### Environment

Copy `backend/.env.example` to `backend/.env` and fill in your Azure credentials:

```env
AZURE_AI_FOUNDRY_ENDPOINT=https://your-resource.services.ai.azure.com/
AZURE_AI_FOUNDRY_API_KEY=your-key
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your-search-key
```

The app runs in demo mode without Azure credentials — allocation reasoning is fully functional, work assistant falls back to direct GPT-4o, and Foundry IQ enrichment is skipped.

### Demo accounts

Three seed worker accounts are available from the Login button:

| Name | Skills | Location |
|------|--------|----------|
| Thabo Mabena | Painting, Tiling, General repair | Sunnyside |
| Sarah Mokoena | Cleaning, Gardening | Hatfield |
| James Moyo | Carpentry, Tiling, Painting | Riviera |

### Demo zone — Pretoria, South Africa

All 12 seed workers are located in the Pretoria metro area. **If the map shows zero results, your pin is outside the demo zone.** Use the editable coordinate fields in the map header to jump straight to the worker pool:

| Area | Latitude | Longitude | Good for |
|------|----------|-----------|----------|
| Pretoria CBD (default) | -25.7463 | 28.1885 | Any category |
| Hatfield | -25.7463 | 28.1885 | Cleaning, Gardening |
| Sunnyside | -25.7625 | 28.2120 | Painting, Tiling |
| Brooklyn | -25.7330 | 28.2515 | Moving, Carpentry |
| Centurion | -25.7700 | 28.1900 | Electrical, Plumbing |

**Quick demo sequence:**
1. Set coordinates to `-25.7463, 28.1885`, category `cleaning`, budget `R500`, radius `10km` → run allocation
2. Change budget to `R200` → observe budget fit eliminating premium workers
3. Raise budget to `R1000` → full pool returns, reordered by composite score
4. Log in as Thabo → ask "Who did I tile for?" in Work Assistant (Memory mode)

---

## Running tests

```bash
cd backend
python -m pytest tests/test_allocation.py -v
```

24 tests covering: Haversine distance, skills filter, safety-critical blocking, reliability filter, fairness penalty (inclusive threshold), reliability composite with ratings, budget fit scoring, composite weights, distance decay, confidence signal.

---

## Design principles

1. **Fairness is structural, not aspirational.** The fairness engine is code, not a policy statement.
2. **Explainability is mandatory.** Every decision ships with a full reasoning trace. No black boxes.
3. **Safety is enforced, not assumed.** General-repair workers cannot be matched to electrical or plumbing jobs.
4. **Grounded answers, not guesses.** Foundry IQ ensures the assistant brain cites its sources.
5. **Real history, not static profiles.** Ratings and payment history feed back into allocation scoring.
6. **Confidence must mean something.** The confidence signal reflects margin over the runner-up and pool size — not just the winner's score.
7. **No employee left behind.** The fairness engine ensures work spreads across the community. This is the operating principle of every algorithm in the system.

---

## What NELB is NOT

- Not a chatbot. A reasoning agent with structured, testable logic pipelines.
- Not a general job board (LinkedIn, Indeed).
- Not prompt-only AI. The allocation engine is real Python with 24 unit tests.
- Not unfair. The fairness engine is non-negotiable.

---

*Built for the Microsoft Agents League @ AI Skills Fest 2026 — Reasoning Agents track.*
*Azure AI Foundry · Foundry IQ · Semantic Kernel · GitHub Copilot*
