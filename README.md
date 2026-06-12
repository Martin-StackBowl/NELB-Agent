# NELB — No Employee Left Behind

An intelligent reasoning agent for fair job distribution in community-level gig economies.

**Built on:** Microsoft Azure AI Foundry (o4-mini reasoning model, gpt-4o-mini chat model)  
**IQ Layer:** Foundry IQ (Azure AI Search — grounded knowledge retrieval with citations)  
**Developed with:** GitHub Copilot  
**Demo location:** Pretoria, South Africa (all seed data is set in the greater Pretoria area)

**🏆 Track:** Reasoning Agents — Microsoft Agents League @ AI Skills Fest 2026

---

## 🎯 The Problem

In community-level gig economies — particularly across the Global South — a well-connected few capture most of the available jobs. Workers with skills but no visibility get left behind. Employers have no reliable way to find vetted, nearby workers for simple tasks. There is no memory of past work relationships. And there is no system ensuring work distribution stays fair.

NELB solves all of this with a single reasoning agent that makes **transparent, explainable decisions** — every recommendation comes with a full reasoning trace showing what was considered, what was eliminated, and why.

---

## 🧠 Four Reasoning Brains

NELB's agent has four tools. The o4-mini reasoning model decides which to call based on natural language input.

### Brain 1 — Allocation Engine (Deterministic Python + Foundry IQ Enrichment)

A 6-step reasoning pipeline that finds the best workers for a job:

0. **Self-exclusion** — Removes the posting user from candidates (you can't hire yourself)
1. **Skills Filter** — Match job category to worker skills (general repair = partial 0.7 match)
2. **Reliability Filter** — Remove workers below 50% reliability score
3. **Availability Filter** — Exclude unavailable workers
4. **Distance Analysis** — Score by proximity using Haversine formula (linear decay to 0 at radius boundary)
5. **Fairness Analysis** — Penalize workers with 3+ jobs in the last 7 days

**Composite scoring:** Skill 30% + Reliability 25% + Distance 25% + Fairness 20%

**Foundry IQ enrichment:** After the Python engine decides, it queries the knowledge base to explain *why* the decisive factor mattered — returning cited reasoning grounded in documented allocation criteria.

### Brain 2 — Memory Recall (Natural Language → SQL)

Workers query their job history in natural language:
- "Who did I tile a kitchen for last year?"
- "How many cleaning jobs did I do in the last 3 months?"
- "What was my rating on my last plumbing job?"

Parses intent (category, time period, client hints), builds dynamic SQLAlchemy queries, returns structured records with natural language answers.

### Brain 3 — Work Assistant (Foundry IQ Knowledge Retrieval)

Answers practical work questions using Azure AI Search + gpt-4o-mini:
- "Which drill bit for a 6mm wall plug in brick?"
- "How many bags of cement for a 3m x 4m slab at 100mm depth?"
- "What safety precautions when working with bleach indoors?"

Retrieves from 12 curated trade guides indexed in Azure AI Search. Returns **cited, grounded answers** with `[doc1]`, `[doc2]` notation and source cards. Refuses licensed/dangerous work topics.

### Brain 4 — Profile Lookup (Direct Database Query)

Returns the authenticated worker's profile data:
- "What's my reliability score?"
- "What are my skills?"
- "Am I available for work?"

Queries the PostgreSQL workers table directly — skills, reliability, availability, total jobs, recent job count, average rating. Everything shown on the profile page is queryable through the agent.

---

## 🤖 Natural Language Orchestrator (o4-mini)

Users talk to NELB in natural language. The o4-mini reasoning model decides which brain to invoke:

```
"I need someone to clean my yard, budget R500"
→ o4-mini extracts: {category: "cleaning", budget: 500, location: [from map]}
→ Calls Brain 1 (Allocation)
→ Returns 5 ranked workers + reasoning trace + Foundry IQ explanation

"Who did I paint for last year?"
→ o4-mini identifies: job history query
→ Calls Brain 2 (Memory)
→ Returns matching records from PostgreSQL

"Which drill bit for a 6mm wall plug?"
→ o4-mini identifies: practical work question
→ Calls Brain 3 (Foundry IQ)
→ Returns cited answer from knowledge base

"What's my reliability score?"
→ o4-mini identifies: profile data request
→ Calls Brain 4 (Profile Lookup)
→ Returns worker stats from database
```

This is **multi-step reasoning at multiple levels**: o4-mini reasons about intent and tool selection, the Python engine reasons through allocation constraints, and Foundry IQ retrieves grounded explanations.

---

## 🎓 Foundry IQ Integration

### Knowledge Base (Azure AI Search Index: `nelb-trade-guides`)

**12 indexed documents:**
- Tool and equipment guides (drill types, fastener specs, power tool safety)
- Material calculation references (cement ratios, paint coverage, tile adhesive quantities)
- Safety and compliance guidelines (working at height, chemical handling)
- Allocation criteria documentation (explains each scoring factor)

### Two Integration Points:

**1. Brain 3 — Work Assistant:**
- gpt-4o-mini queries Azure AI Search via the `data_sources` API parameter
- Retrieves relevant chunks from indexed trade guides
- Synthesizes cited answer — every claim is traceable to a source document
- Citation cards displayed in the UI with document names

**2. Brain 1 — Allocation Enrichment:**
- After the Python engine makes its decision, identifies the **decisive factor** (biggest score gap between #1 and #2)
- Queries Foundry IQ: "Why does [distance/fairness/reliability] matter for worker allocation?"
- Appends grounded explanation with citations to the allocation response
- Result: the employer sees not just WHO was recommended, but WHY — with documentation

---

## 🔐 Demo Authentication

For demonstration purposes, NELB uses a simplified login system with pre-seeded worker accounts. This demonstrates context-aware agent behavior without production auth infrastructure.

### How to Use

1. Click **"🔐 Login"** in the top-right corner
2. Select a demo worker:
   - **Thabo Mabena** — Tiler, Painter, General repair
   - **Sarah Nkosi** — Cleaner, Gardener
   - **James Molefe** — Painter, Carpenter
3. Explore the system from that worker's perspective

### What Login Enables

- **Context-aware agent** — Memory recall and profile queries work without asking for IDs
- **Self-exclusion** — Logged-in workers won't appear in their own job allocation results
- **Profile page** — View your data and see what the agent knows about you
- **Natural conversations** — "What's my reliability score?" just works

---

## 📍 Demo Location

The employer's default location is set to **Hatfield, Pretoria, South Africa** (-25.7479, 28.2293). This is your location as the employer — the center point from which NELB scans outward at your chosen radius to find workers near you. Demo workers are distributed across the greater Pretoria area to provide realistic allocation scenarios.

Moving the location pin within Pretoria will produce different results — different workers fall inside or outside the radius, distance scores change, and the reasoning trace reflects the updated geometry. This demonstrates that the allocation engine is genuinely dynamic: the same worker pool produces different recommendations depending on where you are.

> **If you see zero results:** No workers found within {radius}km of your current location. The allocation engine ran correctly — your location is simply outside the area where this demo's worker community is based. Move your pin to the Pretoria, South Africa area to see NELB reason over a full candidate pool.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│         User Input (Natural Language / Form)         │
└────────────────────────┬────────────────────────────┘
                         ↓
            ┌────────────────────────────┐
            │   o4-mini Orchestrator     │
            │   (Intent → Tool Selection)│
            └────┬───────┬───────┬───────┬──┘
                 ↓       ↓       ↓       ↓
          ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
          │Brain1│ │Brain2│ │Brain3│ │Brain4│
          │Alloc │ │Memory│ │Assist│ │Profil│
          └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
             ↓        ↓        ↓        ↓
          ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
          │Python│ │Postgr│ │Azure │ │Postgr│
          │Engine│ │SQL   │ │Search│ │SQL   │
          └──┬───┘ └──────┘ └──────┘ └──────┘
             ↓
          ┌──────────────┐
          │ Foundry IQ   │
          │ Enrichment   │
          └──────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL)
- Azure AI Foundry account with o4-mini and gpt-4o-mini deployed
- Azure AI Search index (`nelb-trade-guides`)

### Backend

```bash
cd backend
pip install -e ".[dev]"
cp .env.example .env
# Fill in Azure credentials in .env

# Start PostgreSQL
docker compose up db -d

# Seed demo data (12 workers, 3 employers, job history)
python seed.py

# Start API server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

### Test the Agent

```bash
# Allocation
curl -X POST http://localhost:8000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "Find me a cleaner near Hatfield, budget R500", "latitude": -25.7479, "longitude": 28.2293}'

# Memory recall
curl -X POST http://localhost:8000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "How many jobs have I done?", "worker_id": "e71d43bb-77ba-42cf-a914-555d0ee70753"}'

# Work assistant (Foundry IQ)
curl -X POST http://localhost:8000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "Which drill bit for a 6mm wall plug in brick?"}'

# Profile lookup
curl -X POST http://localhost:8000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my skills?", "worker_id": "e71d43bb-77ba-42cf-a914-555d0ee70753"}'
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| AI Orchestration | Azure AI Foundry (o4-mini) | Reasoning model for intent + tool selection |
| Knowledge Retrieval | Foundry IQ (Azure AI Search + gpt-4o-mini) | Grounded answers with citations |
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4 | Employer + worker interfaces |
| Maps | React Leaflet + OpenStreetMap | Radius visualisation, location picker |
| State | Zustand | Client-side state (auth, job, worker) |
| Backend | FastAPI, Python 3.11, Pydantic v2 | REST API, agent orchestration |
| Database | PostgreSQL 16, SQLAlchemy async, Alembic | Workers, jobs, history, allocations |
| Containers | Docker Compose | Local development environment |
| Tests | pytest (9 unit tests for allocation engine) | Verify scoring logic |

---

## 📊 Seed Data

| Entity | Count | Details |
|--------|-------|---------|
| Workers | 12 | Varied skills, reliability (45%-96%), Pretoria area |
| Employers | 3 | Mrs. Van Wyk, Mr. Molefe, Mrs. Dlamini |
| Job History | 5+ | Tiling, cleaning, plumbing, painting, repairs |
| Knowledge Docs | 12 | Trade guides indexed in Azure AI Search |

Demo includes edge cases: one unavailable worker (James Moyo), one low-reliability worker (Palesa Khumalo, 45%), workers with overlapping skills, and varied recent job counts for fairness testing.

---

## 🎯 Judging Criteria Alignment

| Criterion | Weight | How NELB Addresses It |
|-----------|--------|----------------------|
| **Accuracy & relevance** | 20% | Foundry IQ for grounded citations. Allocation engine uses verifiable Python logic. Profile data comes from actual database queries. |
| **Reasoning & multi-step thinking** | 20% | o4-mini selects from 4 tools. Allocation runs 6-step pipeline. Foundry IQ adds contextual explanation. Memory parses NL intent. |
| **Creativity & originality** | 15% | Fairness engine is novel — no other platform penalizes job monopolization. Self-exclusion logic. Four-brain architecture for civilian gig work. |
| **User experience** | 15% | Reasoning trace visualized step-by-step. Citation cards. Context-aware auth. Natural language interface to all brains. |
| **Reliability & safety** | 20% | Job categories constrained to safe civilian work. Assistant refuses dangerous topics. 9 unit tests. Haversine distance verified. All decisions logged. |

---

## 📝 API Endpoints

| Endpoint | Method | Brain | Description |
|----------|--------|-------|-------------|
| `/api/agent/run` | POST | All | Natural language orchestrator (o4-mini decides) |
| `/api/agent/allocate` | POST | 1 | Direct allocation with structured input |
| `/api/agent/recall` | POST | 2 | Direct memory recall |
| `/api/agent/assist` | POST | 3 | Direct work assistant (Foundry IQ) |
| `/api/agent/profile` | POST | 4 | Direct profile lookup |
| `/health` | GET | — | Health check |

---

## 📹 Demo Video

[Link to 5-minute demo video]

---

## 📝 License

MIT License — Built for Microsoft Agents League @ AI Skills Fest 2026

---

*No employee left behind is not just a name — it is the operating principle of every algorithm in the system.*
