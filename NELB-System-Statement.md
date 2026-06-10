# NELB — No Employee Left Behind

## Full System Statement, Design Brief & Hackathon Submission Kit

**Microsoft Agents League @ AI Skills Fest 2026 — Reasoning Agents Track**

---

## 1. What NELB is

NELB (No Employee Left Behind) is an intelligent reasoning agent and job distribution platform designed for the civilian gig economy at the community level. It operates as a two-sided marketplace where any person — with or without a formal degree or employment history — can either offer their skills for hire or post a job they need done. NELB sits at the intersection of Uber/Bolt's proximity-based matching model and a fairness-first employment philosophy, constrained to a specific category of low-to-mid tier civilian jobs to ensure safety, legality, and risk management.

NELB is not a general job board. It is not LinkedIn. It is not a corporate recruitment tool. It is a neighbourhood-level work distribution system that ensures no single person monopolises available work in a community, while also ensuring employers quickly find the right person for their specific task.

NELB is built on Microsoft Azure AI Foundry, orchestrated by Semantic Kernel, and developed with GitHub Copilot. It is submitted under the Reasoning Agents track of the Microsoft Agents League contest at AI Skills Fest 2026.

---

## 2. The problem NELB solves

In informal and semi-formal labour markets — particularly in communities across the Global South — work distribution is deeply unfair. A well-connected few get most of the jobs. People with skills but no visibility get left behind. Employers have no reliable way to find vetted, nearby workers for simple tasks. There is no memory of past work relationships. There is no assistant helping a worker do a job better. And there is no system ensuring the work stays legal, safe, and fairly spread.

NELB solves all of this in a single, coherent reasoning agent.

---

## 3. Job categories NELB operates in

NELB is deliberately constrained to the following civilian job categories. This is not a limitation — it is a design decision for risk management, legal compliance, and focused execution:

- Cleaning (domestic and commercial light cleaning)
- Gardening and yard work
- Painting (interior and exterior)
- Basic plumbing (not licensed high-pressure or gas work)
- Basic electrical (not licensed high-voltage work)
- Tiling (floors and walls)
- Carpentry (furniture assembly, basic woodwork)
- Moving and packing
- General repairs and handyman tasks
- Other pre-approved low-risk civilian tasks

Jobs outside these categories are not permitted on the platform. This prevents illegal activity, high-risk unlicensed work, and liability exposure.

---

## 4. How NELB works — the user experience

### From the employer's side

An employer opens the app and creates a job. They describe the task (e.g. "clean my yard"), set a budget, and confirm their location. NELB immediately scans a configurable radius (default 5km) around the employer's location and performs its full multi-step reasoning pipeline across all eligible workers. The employer then sees a map with up to 5 recommended worker circles — ranked by NELB's composite score — each clickable to view skills, ratings, job history, and the reasoning behind their ranking. The employer chooses from this shortlist and can initiate a chat or call directly. Once a worker is selected and the job is completed, payment is processed through the platform's smart payment system and a rating is recorded.

### From the worker's side

A worker registers their skills, location, and availability. When an employer posts a job, NELB evaluates eligible workers and generates a ranked shortlist of up to 5 recommendations. If a worker is selected by the employer, NELB notifies the worker and facilitates communication between both parties. Workers do not browse or compete for job listings — NELB brings the work to them based on merit and fairness. Crucially, the fairness engine ensures that a worker who has already received multiple jobs recently will be ranked lower for new assignments, giving others in the community a fair turn. Workers also have access to NELB as a personal work assistant — they can ask questions about how to do a task, which tools to use, how much material to buy, safety precautions, and more.

### The findwork || employ duality

Every user on NELB can operate as both an employer and a worker simultaneously. A person cleaning someone's yard on Monday can post a job to have their own house painted on Wednesday. This ecosystem design makes the platform self-sustaining.

---

## 5. NELB's three core intelligence systems (the three brains)

NELB is powered by three AI reasoning modules, all orchestrated by a single agent built on Microsoft Azure AI Foundry with Semantic Kernel as the orchestration SDK.

### Brain 1 — The Allocation Brain (Fair Job Distribution)

This is the core reasoning engine. When a job is posted, the allocation brain does not simply return the nearest available worker. It runs a 5-step multi-constraint reasoning pipeline written in pure Python — not prompts, not an LLM call, but real executable logic:

**Step 1 — Skills and qualification filter**
Only workers who have the required skill category in their registered profile proceed. Workers with "general repair" as a catch-all skill receive a partial match score (0.7) rather than a full match (1.0).

**Step 2 — Reliability filter**
Workers with a reliability score below 50% are removed from consideration. Reliability is calculated from job completion rate, cancellation history, and employer ratings.

**Step 3 — Availability filter**
Workers who have marked themselves unavailable are excluded.

**Step 4 — Distance analysis**
Each remaining worker is scored by their proximity to the job location using the Haversine formula for accurate geodesic distance. Workers outside the configured radius are eliminated. Azure Maps provides travel time estimates for shortlisted candidates. Closer workers receive higher distance scores, with linear decay to zero at the radius boundary.

**Step 5 — Fairness analysis**
This is NELB's defining feature. The system checks how many jobs each worker has completed in the past 7 days. Workers who have exceeded the fairness threshold (default: 3 jobs in 7 days) receive a penalty to their fairness score. This ensures that no single worker monopolises available work in a community.

**Final composite score:**

| Factor | Weight |
|--------|--------|
| Skill match | 30% |
| Reliability | 25% |
| Distance | 25% |
| Fairness | 20% |

The system recommends the top 5 highest-scoring workers alongside a full reasoning trace — which workers were eliminated at each step and why, what each score was, and the final explanation in plain language. The employer then chooses from this shortlist, and the selected worker is notified.

### Brain 2 — The Memory Brain (Work History and Recall)

NELB maintains a detailed, searchable record of every job a worker has completed on the platform. Workers can query this history in natural language:

- "Who did I install tiles for last year?"
- "What was the name of the woman in Pretoria East whose gate I repaired in April?"
- "How many cleaning jobs did I do in the last 3 months?"
- "What was my rating on the last plumbing job I did?"

NELB parses the query, extracts intent (category, time period, client name hints, location hints), queries the PostgreSQL job history database, and returns a structured, human-readable answer.

The memory system stores: client names and contact details, job category and description, location (human-readable and coordinates), completion date and time, ratings and employer feedback, worker notes, and payment records.

This memory also feeds the allocation brain — the fairness engine reads from job history to calculate recent job counts per worker.

### Brain 3 — The Work Assistant Brain (Contextual Job Help)

NELB is a buddy that travels with the worker to every job. The assistant brain answers practical, work-related questions in real time, powered by GPT-4o deployed inside Azure AI Foundry:

- "Which drill bit is right for a 6mm wall plug in brick?"
- "How many bags of cement do I need for a 3m x 4m slab at 100mm depth?"
- "What is the correct ladder angle for working at height?"
- "How do I remove paint from a wooden surface before repainting?"
- "What safety precautions should I take when working with bleach indoors?"

The assistant is aware of the worker's current job context and is strictly constrained to job-related civilian work topics — it will not advise on licensed electrical work, gas fitting, structural engineering, or any illegal activity.

---

## 6. Technical architecture

### Stack overview

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | Web application — employer and worker interfaces |
| Maps (UI) | React Leaflet | Renders radius scan circle and worker pins on map |
| State | Zustand | Holds job context, chat history, reasoning trace |
| Hosting (frontend) | Vercel | One-command deploy, live preview URL for judges |
| Backend | FastAPI, Python 3.11, Pydantic v2 | REST API gateway — routes all agent requests |
| Hosting (backend) | Azure App Service | Managed Python hosting, Microsoft-aligned |
| Containers | Docker + Docker Compose | Local dev environment, one-command setup |
| AI Agent | Azure AI Foundry | NELB agent runtime — required by Reasoning Agents track |
| Agent Service | Azure AI Agent Service | Manages state, tool calls, multi-step execution loops |
| LLM | GPT-4o (via Foundry) | Powers Brain 3 (assistant) and explanation enrichment |
| Orchestration | Semantic Kernel (Python SDK) | Connects FastAPI to Foundry, defines agent tools |
| Dev tool | GitHub Copilot | Scaffolding, engine code, tests, README — required by contest |
| Database | Azure PostgreSQL v16 | Workers, jobs, allocations, history, reasoning logs |
| ORM | SQLAlchemy async + asyncpg | Python database access layer |
| Migrations | Alembic | Schema versioning — reproducible for judges |
| Maps (backend) | Azure Maps | Radius scan, distance calculation, travel time |
| Auth | Supabase Auth | JWT-based login for employers and workers |
| Secrets | Azure Key Vault | Stores all API keys — no credentials in code |
| Logging | structlog | Structured JSON logs, every decision audited |
| Tests | pytest | 9 unit tests for the allocation engine |

### Agent tool definitions (Semantic Kernel)

Three tools registered in the Semantic Kernel kernel:

- **allocate_job** — calls the Python allocation engine, returns ranked candidates and full reasoning trace
- **recall_memory** — queries job history with natural language intent parsing, returns structured records
- **work_assist** — calls GPT-4o via Foundry with constrained system prompt, returns contextual help

### Database tables

- **workers** — profiles, skills array, reliability score, GPS coordinates, availability flag
- **clients** — employer profiles, GPS coordinates
- **jobs** — posted work, category, location, budget, status
- **allocations** — one per job, stores full reasoning trace JSON, all five scores, confidence
- **job_history** — denormalised completed work log, powers Brain 2 recall queries
- **reasoning_logs** — audit trail of every agent decision with input, steps, output, and duration

---

## 7. GitHub Copilot — role in development

GitHub Copilot was used throughout the development of NELB as the primary AI-assisted development tool. Specific contributions:

- **Allocation engine:** Copilot completed the Haversine distance formula implementation, generated the fairness scoring logic from a plain-language description of the fairness rules, and suggested the weighted scoring approach that became the final composite score formula.
- **API routes:** Copilot scaffolded all three FastAPI agent route handlers (`/allocate`, `/recall`, `/assist`) from the endpoint descriptions in the design brief, including the Pydantic request/response schemas.
- **SQLAlchemy models:** Copilot generated the full ORM model file (Worker, Client, Job, Allocation, JobHistory, ReasoningLog) from the database table descriptions, including relationship definitions and UUID default functions.
- **Unit tests:** Copilot wrote the initial set of 9 pytest unit tests for the allocation engine, covering skills filtering, reliability filtering, availability, radius, fairness penalty, general repair fallback, and edge cases. Tests were reviewed and refined manually.
- **Semantic Kernel integration:** Copilot completed the `@kernel_function` decorators and the NELBAgent class structure, accelerating the Foundry integration significantly.
- **README and architecture diagram:** Copilot drafted the Mermaid architecture diagram syntax and the README structure, which was then expanded into the full submission documentation.

GitHub Copilot is visible throughout the commit history of the public repository and is explicitly credited in the README.

---

## 8. Submission-ready project description

**Project name:** NELB — No Employee Left Behind

**Track:** Reasoning Agents (Microsoft Foundry)

**Problem solved:** In community-level gig economies, job distribution is unfair. A few well-connected workers get most jobs. Employers have no reliable way to find nearby, vetted workers for simple tasks. Workers have no memory of their own work history and no intelligent assistant to help them do jobs better.

**What NELB does:** NELB is an intelligent reasoning agent built on Microsoft Azure AI Foundry that solves fair job distribution for civilian workers. It has three brains: an Allocation Brain that runs a 5-step reasoning pipeline (skills → reliability → availability → distance → fairness) to recommend the right worker while ensuring no one monopolises work in a community; a Memory Brain that lets workers query their own job history in natural language ("who did I tile a kitchen for last year?"); and a Work Assistant Brain powered by GPT-4o that answers practical job questions in real time ("which drill bit for a 6mm wall plug?").

Every decision NELB makes comes with a full reasoning trace — what was considered, what was eliminated, and why. This is not a chatbot. The allocation engine is real Python logic with verifiable, testable behaviour.

**Technologies used:** Microsoft Azure AI Foundry (agent runtime), Azure AI Agent Service, GPT-4o, Semantic Kernel (Python orchestration), GitHub Copilot (development), Azure Maps (geospatial), Azure PostgreSQL (data), Azure App Service (hosting), FastAPI (backend), Next.js (frontend).

**Why it matters:** NELB is designed for communities where formal employment is out of reach for many. The fairness engine is not a policy statement — it is code. No employee left behind is not just a name. It is the operating principle of every algorithm in the system.

---

## 9. Demo video script (5 minutes max)

### Scene 1 — Problem statement (30 seconds)

Open on the NELB home screen. Narrate: "In communities across the world, skilled workers are left behind — not because they lack ability, but because they lack visibility. NELB changes that. No employee left behind."

### Scene 2 — Employer posts a job (60 seconds)

Show an employer creating a job: "Clean my yard, Pretoria East, R500 budget." The map animates — a radius circle expands from the employer's pin. Five worker circles appear within the radius, ranked by NELB's reasoning, each with a skill tag and rating. Narrate: "NELB scans the area, finds qualified workers, and does something no other platform does — it reasons through the decision."

### Scene 3 — The reasoning panel (90 seconds)

Click "Find best match." The reasoning panel animates step by step:

- Step 1: 12 workers found. Skills filter — 8 qualify.
- Step 2: Reliability filter — 6 remain.
- Step 3: Availability filter — 5 remain.
- Step 4: Distance analysis — 4 within 5km.
- Step 5: Fairness analysis — Sarah ranks first. She hasn't had a job in 4 days.

Show the confidence score (91%) and the breakdown: skill 95%, reliability 92%, distance 87%, fairness 90%. Narrate: "This is not a recommendation. It is a reasoned decision — with every step visible and every score explained."

### Scene 4 — Memory recall (60 seconds)

Switch to the worker view. Worker types: "Who did I install tiles for last year?" NELB responds instantly with a record: Mrs Dlamini, Centurion, April 2025, 5-star rating, notes: "used large-format porcelain, grouted with charcoal mix." Narrate: "NELB remembers every job. Workers never lose their history."

### Scene 5 — Work assistant (45 seconds)

Worker is on site. Types: "Which drill bit do I need for a 6mm wall plug in brick?" NELB responds with a precise, practical answer — bit type, speed setting, depth guide. Narrate: "NELB is the buddy on every job site. Powered by Azure AI Foundry."

### Closing (15 seconds)

Show the architecture diagram briefly. End card: "NELB — No Employee Left Behind. Built on Microsoft Azure AI Foundry. Three brains. One mission."

---

## 10. Judging criteria alignment

| Criterion | Weight | How NELB addresses it |
|-----------|--------|----------------------|
| Accuracy & relevance | 20% | Built on Azure AI Foundry as required. Allocation engine directly solves a real problem with verifiable logic. All three Foundry tool calls are functional. |
| Reasoning & multi-step thinking | 20% | 5-step allocation pipeline is the definition of multi-step reasoning. Every step documented in the reasoning trace. Memory query parsing adds a second reasoning layer. |
| Creativity & originality | 15% | "No Employee Left Behind" fairness principle is unique. No other platform constrains job distribution to prevent monopolisation. The three-brain architecture applied to civilian gig work is novel. |
| User experience & presentation | 15% | Demo video follows a clear narrative. Reasoning panel is the visual centrepiece. Workers and employers both have polished, purpose-built interfaces. |
| Reliability & safety | 20% | Job categories constrained to low-risk civilian work. Allocation engine has 9 unit tests. All decisions logged to reasoning_logs table. Azure Key Vault for secrets. Structured logging on every agent call. |
| Community vote | 10% | Social impact narrative — fair work for underserved communities — is compelling and shareable. "No employee left behind" resonates. |

### Additional prize alignment

- **Hack for Good:** NELB directly solves a community need — fair job distribution in informal labour markets. The fairness engine is the technical proof.
- **Best use of IQ tools:** All three Azure AI Foundry tools (allocate, recall, assist) are original implementations, not wrappers.
- **Best overall agent:** The combination of a constrained reasoning pipeline, natural language memory, and a contextual work assistant makes NELB one of the most complete agent submissions in the contest.

---

## 11. The broader context — ArtisanPool

NELB is the AI intelligence layer within a larger application called ArtisanPool. ArtisanPool is the full platform — the marketplace, the profiles, the payment system, the employer and worker interfaces, the ratings ecosystem, and the legal framework. NELB is the brain of ArtisanPool, but it can also function as a standalone reasoning agent, which is how it is submitted to the Microsoft Agents League hackathon.

For the hackathon, NELB is extracted from ArtisanPool and built as an independent web application demonstrating all three brains as a unified Foundry agent.

---

## 12. What NELB is NOT

- NELB is not a chatbot. It is a reasoning agent with structured logic pipelines.
- NELB is not a general job board (LinkedIn, Indeed, etc.)
- NELB is not for professional or licensed trade work beyond basic civilian tasks.
- NELB is not a social network.
- NELB does not operate on prompt-only AI responses. Its allocation engine is real code with real logic.
- NELB does not allow one person to dominate job distribution in a community. The fairness engine is non-negotiable.

---

## 13. Design principles

1. **Fairness is structural, not aspirational.** The fairness engine is code, not a policy statement.
2. **Explainability is mandatory.** Every decision NELB makes comes with a reasoning trace. No black boxes.
3. **Memory makes NELB a companion, not a tool.** Workers should feel that NELB knows their history and works for them.
4. **Constraint enables trust.** By limiting job categories, NELB earns the trust of both employers and workers.
5. **Both sides of the market matter equally.** Employer experience and worker experience are designed with equal care.
6. **Every person deserves a fair shot.** No employee left behind is not just a name — it is the operating principle of every algorithm in the system.

---

*This document is the authoritative system statement and submission kit for NELB. Version 2 — updated to include GitHub Copilot role, demo video script, submission-ready project description, and full judging criteria alignment. Feed it to any AI agent, code generator, designer, or collaborator working on any part of the NELB or ArtisanPool system.*
