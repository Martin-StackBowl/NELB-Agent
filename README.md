# NELB — No Employee Left Behind

An intelligent reasoning agent for fair job distribution in community-level gig economies.

**Built on:** Microsoft Azure AI Foundry (o4-mini, gpt-4o-mini)  
**IQ Layer:** Foundry IQ (knowledge retrieval with citations)  
**Developed with:** GitHub Copilot

**🏆 Track:** Reasoning Agents — Microsoft Agents League @ AI Skills Fest 2026

---

## 🎯 The Problem

Community-level gig economies suffer from job monopolisation—top-performing workers capture most opportunities while others struggle for income. Traditional allocation systems optimize purely for quality, creating extreme income inequality.

NELB solves this with **transparent, multi-step reasoning** that balances skills, reliability, proximity, and fairness.

---

## 🧠 Three Reasoning Brains

### 1. Allocation Brain (Deterministic Reasoning + Foundry IQ)
**5-step reasoning pipeline:**
1. **Skills Filter** — Match job requirements to worker capabilities
2. **Reliability Filter** — Eliminate workers below 50% completion rate
3. **Availability Filter** — Check schedule conflicts
4. **Distance Analysis** — Score by proximity using Haversine formula
5. **Fairness Analysis** — Penalize workers with recent job concentration

**Output:** Top 5 ranked workers with composite scores, full reasoning trace, and **Foundry IQ enrichment** explaining the decisive factor.

**Example:**
```
Recommended: Sarah (91% confidence)

Allocation Pipeline ⚙️ Python deterministic reasoning:
Step 1: Skills filter → 8 candidates
Step 2: Reliability filter → 7 candidates
...

Decision Explanation 📖 Grounded by Foundry IQ:
Why Sarah was prioritized: Fairness scoring gave Sarah priority
because she has 0 recent jobs while James received 4 jobs in 
the past 7 days [1].

Sources:
1 | 📄 Why Fairness Weighting Matters | nelb-allocation-criteria
```

### 2. Memory Brain (Natural Language Recall)
Workers query their job history in natural language:
- "Who did I tile a kitchen for last year?"
- "Show me my painting jobs in Pretoria"

Parses intent, extracts filters, returns matching job records from PostgreSQL.

### 3. Assistant Brain (Foundry IQ Knowledge Retrieval)
Answers practical work questions using **Azure AI Search + gpt-4o-mini**:
- "Which drill bit for a 6mm wall plug?"
- "How do I fix a dripping tap?"

Retrieves from curated knowledge base (11 trade guides), returns **cited, grounded answers** to reduce hallucination.

---

## 🤖 Natural Language Orchestrator

**Unified interface using o4-mini:**

User types natural language → **o4-mini reasoning model** decides which brain to call:

```bash
"Find me a plumber near Hatfield with budget R600"
→ o4-mini extracts: {category: "plumbing", location: Hatfield, budget: 600}
→ Calls Allocation Brain
→ Returns ranked workers with Foundry IQ explanations

"Which drill bit for a 6mm wall plug?"
→ o4-mini identifies: work assistance question
→ Calls Assistant Brain (Foundry IQ)
→ Returns cited answer from knowledge base
```

**Endpoints:**
- `/api/agent/allocate` — Direct allocation (structured input)
- `/api/agent/recall` — Direct memory recall
- `/api/agent/assist` — Direct work assistance
- `/api/agent/run` — **Natural language orchestrator** (o4-mini routes automatically)

---

## 🎓 Foundry IQ Integration

### Knowledge Base (Azure AI Search)
**12 curated documents:**
- 11 trade guides (plumbing, electrical, carpentry, etc.)
- 1 allocation criteria document (explains reasoning behind each factor)

### How Foundry IQ is Used:

**1. Assistant Brain (Brain 3):**
- User asks work question
- gpt-4o-mini queries Azure AI Search with `data_sources` parameter
- Retrieves relevant chunks from trade guides
- Synthesizes cited answer with `[doc1]`, `[doc2]` notation
- Returns grounded response with citation cards

**2. Allocation Enrichment (Brain 1):**
- Python engine completes allocation decision
- Identifies **decisive factor** (biggest score difference between winner and runner-up)
- Queries Foundry IQ: "Why does [distance/fairness/reliability] matter?"
- Retrieves explanation from `nelb-allocation-criteria.md`
- Appends grounded context with citations to allocation response

**Result:** Every decision is explained with **documented reasoning**, not LLM invention.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  User Input (Natural Language or Structured Form)  │
└────────────────────┬────────────────────────────────┘
                     ↓
        ┌────────────────────────────┐
        │  o4-mini Orchestrator      │
        │  (Tool Selection)          │
        └─────────┬──────────────────┘
                  ↓
     ┌────────────┼────────────┐
     ↓            ↓            ↓
┌─────────┐  ┌─────────┐  ┌──────────────┐
│ Brain 1 │  │ Brain 2 │  │   Brain 3    │
│Allocate │  │ Recall  │  │   Assist     │
└────┬────┘  └────┬────┘  └──────┬───────┘
     │            │               │
     ↓            ↓               ↓
┌─────────┐  ┌─────────┐  ┌──────────────┐
│ Python  │  │Postgres │  │Foundry IQ    │
│ Engine  │  │  SQL    │  │(AI Search +  │
│         │  │         │  │gpt-4o-mini)  │
└────┬────┘  └─────────┘  └──────────────┘
     ↓
┌──────────────────┐
│  Foundry IQ      │
│  Enrichment      │
│  (Explains       │
│  decisive factor)│
└──────────────────┘
```

**Flow:**
1. User sends natural language or form data
2. **o4-mini** (reasoning model) decides which brain to invoke
3. **Brain 1** (Python) runs deterministic allocation → calls **Foundry IQ** for enrichment
4. **Brain 2** (SQL) queries job history → formats with LLM
5. **Brain 3** (Foundry IQ) retrieves from knowledge base → returns cited answers
6. Response includes reasoning traces + grounded citations

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Azure AI Foundry account
- Azure AI Search index

### Backend Setup

```bash
cd backend
pip install -e ".[dev]"
cp .env.example .env
# Configure Azure credentials in .env
# Start PostgreSQL
docker-compose up db -d
# Run migrations
alembic upgrade head
# Seed demo data (12 workers around Pretoria)
python seed.py
# Start API
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Configure API URL in .env.local
npm run dev
```

### Test Natural Language Orchestrator

```bash
curl -X POST http://localhost:8000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "Find me a plumber near Hatfield with budget R600"}'
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Orchestration** | Azure AI Foundry (o4-mini for reasoning) |
| **Knowledge Retrieval** | Foundry IQ (Azure AI Search + gpt-4o-mini) |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, React Leaflet |
| **Backend** | FastAPI, Python 3.11, Pydantic v2 |
| **Database** | PostgreSQL, SQLAlchemy, Alembic |
| **Maps** | Leaflet (OpenStreetMap) |
| **Deployment** | Docker, Docker Compose |

---

## 📊 Demo Data

The seed script creates:
- **12 workers** with varied skills (cleaning, plumbing, carpentry, etc.)
- Located around Pretoria, South Africa
- Different reliability scores (45%-96%)
- Varying availability and recent job counts
- **5 job history records** for testing fairness and memory recall

---

## 🎯 Why This Matters

**Social Impact:**  
In community gig economies, income concentration is a documented problem. Top 10% of workers capture 60-80% of jobs. NELB's fairness engine actively counteracts this by prioritizing workers who need work most.

**Transparency:**  
Every recommendation includes:
- Full 5-step reasoning trace
- Individual dimension scores (skill, reliability, distance, fairness)
- Grounded explanations with citations from documented criteria
- Auditable decision logic

**Reasoning Agent:**  
NELB demonstrates multi-step reasoning at multiple levels:
1. **o4-mini**: Intent understanding and tool selection
2. **Python Engine**: 5-step allocation pipeline with scoring
3. **Foundry IQ**: Contextual explanation retrieval

---

## 📹 Demo Video

[Link to 5-minute demo video on YouTube]

---

## 🏆 Hackathon Compliance

**Track:** 🧠 Reasoning Agents  
**IQ Layer:** ✅ Foundry IQ (knowledge retrieval with citations)  
**Multi-step Reasoning:** ✅ 5-step allocation pipeline + enrichment  
**Microsoft Foundry:** ✅ Azure AI Foundry (o4-mini, gpt-4o-mini)  
**Repository:** ✅ Public GitHub with full source code  
**Demo:** ✅ Working frontend + backend + natural language interface

---

## 📝 License

MIT License - Built for Microsoft Agents League @ AI Skills Fest 2026

---

*No employee left behind is not just a name — it is the operating principle of every algorithm in the system.*
