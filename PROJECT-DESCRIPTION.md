# NELB — No Employee Left Behind

**Track:** Reasoning Agents (Microsoft Foundry)
**Required IQ layer:** Foundry IQ
**Built with:** Azure AI Foundry · Foundry IQ (Azure AI Search) · GPT-4o-mini · o4-mini · FastAPI · Next.js · PostgreSQL · GitHub Copilot

---

## The problem

In informal and community-level labour markets — especially across the Global South — work is distributed unfairly. A small, well-connected few capture most of the available jobs while skilled people with no visibility are left behind. The consequences compound:

- **Employers** have no reliable way to find vetted, nearby workers for everyday tasks (cleaning, painting, plumbing, tiling, repairs).
- **Workers** have no memory of their own work history and no assistant to help them do a job correctly and safely on site.
- **Communities** suffer extreme income concentration: a handful of workers monopolise the work, and everyone else is squeezed out.
- **Nobody** can see *why* a particular worker was chosen — allocation is opaque, so it can't be trusted or audited.

Existing gig platforms optimise purely for speed or rating, which makes the rich-get-richer dynamic worse. None of them treat fairness as a structural requirement.

## What NELB does

NELB is a reasoning agent that distributes community work fairly and explains every decision. A single natural-language chat ("Talk to NELB") routes to four specialised capabilities, and the agent decides which one your request needs:

1. **Allocation Brain** — a deterministic 6-step reasoning pipeline that ranks workers for a job: self-exclusion → skills → reliability (blended with star ratings) → availability → distance → budget fit → fairness. It returns a ranked shortlist with a full, step-by-step reasoning trace and a margin-based confidence score. This is real, testable Python — not a prompt — so the same inputs always produce the same auditable result.

2. **Memory Brain** — workers query their own job history in plain language ("who did I paint for last year?"). NELB parses intent and queries the database directly.

3. **Work Assistant Brain** — practical, on-site help ("how many bags of cement for a 3m × 4m slab at 100mm?"). Answers are grounded by **Foundry IQ** — retrieved from a curated knowledge base of 14 trade guides indexed in Azure AI Search — and returned with inline citations. If the knowledge base doesn't contain the answer, NELB says so instead of hallucinating.

4. **Profile Brain** — a worker's stats, skills, reliability, and ratings, read directly from the database.

## Why it matters — fairness as code

NELB's defining feature is the **fairness engine**. Workers who have already taken several jobs in the last 7 days receive an escalating penalty, so others in the community get a fair turn. This isn't a policy statement — it is executable logic inside the allocation pipeline, visible in the reasoning trace. "No employee left behind" is the literal operating rule of the algorithm.

Budget reasoning is equally grounded: each worker's expected price comes from their real historical earnings for that job category (or a category baseline), and being *cheaper* never scores higher — preventing a race to the bottom that would harm worker income.

## How the AI adds value

- **Multi-step reasoning, made visible.** The allocation pipeline narrows the candidate pool one constraint at a time and shows the count and eliminations at every step. Judges and users can read exactly how and why a decision was made.
- **The right tool for each job.** The o4-mini orchestrator uses language understanding to classify intent and route to the correct brain; the deterministic engine handles the decision that actually matters (who gets the work). The LLM is used where it excels, and verifiable code handles what must be reliable.
- **Grounded, not guessed.** Foundry IQ ensures the Work Assistant cites its sources from an indexed knowledge base. The `nelb-allocation-criteria` document means NELB can even explain its *own* reasoning from a cited source rather than from model weights.
- **Safety by construction.** Job categories are constrained to low-risk civilian work, the general-repair fallback is blocked for electrical and plumbing, and dangerous/licensed topics are refused.

## Technologies used

| Layer | Technology |
|-------|-----------|
| Reasoning agent runtime | **Azure AI Foundry** (o4-mini orchestrator) |
| Required IQ layer | **Foundry IQ** — Azure AI Search "On Your Own Data" with citations |
| Grounded answers | GPT-4o-mini via Azure AI Foundry |
| Backend | FastAPI, Python 3.11, Pydantic v2, SQLAlchemy async |
| Database | PostgreSQL 16 (Docker for local dev) |
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4, Zustand, React Leaflet |
| AI-assisted development | GitHub Copilot |

## What's verifiable

- The allocation engine is covered by **24 unit tests** (skills, safety-critical blocking, reliability, fairness threshold, rating blend, budget fit, distance decay, confidence).
- Every recommendation ships with a reasoning trace and a cited decisive-factor explanation.
- Foundry IQ answers carry inline citations to named source documents.

## Demo notes

- Seeded worker community is based in **Pretoria, South Africa**. If a search returns no workers, the pin is outside the demo zone — editable coordinate fields and a "Reset to Pretoria CBD" control are provided.
- Three demo worker accounts are available from the Login button (Thabo, Sarah, James) so the experience can be explored from a worker's perspective.

---

*NELB — No Employee Left Behind. Built for the Microsoft Agents League @ AI Skills Fest 2026, Reasoning Agents track.*
