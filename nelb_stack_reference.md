# NELB Full Stack Reference

Every technology listed by layer with its role and what it does in the system.

---

## Frontend

### Next.js 14 — App router
**Role:** The entire web application that employers and workers interact with.

Handles routing between dashboard, job posting, worker profiles, and the NELB chat interface. Server-side rendering makes the app fast on mobile networks. Deploys to Vercel in one command.

`required`

---

### TypeScript — v5
**Role:** Type safety across all frontend code.

Catches errors at compile time — wrong API response shapes, missing fields, bad function arguments. Makes the codebase refactorable without breaking things silently. Especially important for the API client layer calling the NELB agent endpoints.

`required`

---

### Tailwind CSS — v3
**Role:** All styling across the application.

Utility-first classes mean no context switching between CSS files. Builds the reasoning panel, job cards, worker profile circles, radius scan map overlay, and NELB chat bubbles quickly. Critical for a hackathon timeline.

`required`

---

### Vercel — Hosting
**Role:** Deploys and hosts the frontend.

One-command deploy from the GitHub repo. Generates a live preview URL that judges can visit. Handles environment variables for Supabase and API URL. Free tier is sufficient for a hackathon demo.

`required`

---

### React Leaflet — v4
**Role:** Renders the job posting map with the radius scan circle.

Shows the employer's location as a pin, draws the configurable scan radius as a circle overlay, and places clickable worker circles at their GPS coordinates. This is the visual centrepiece of the demo video's employer flow.

`required`

---

### Zustand — v4
**Role:** Global state management.

Holds the current job context, active worker session, NELB chat history, and reasoning trace results. Lightweight alternative to Redux — no boilerplate, just stores. Keeps state in sync between the map, the recommendation panel, and the chat interface.

`recommended`

---

## Backend / API

### FastAPI — Python
**Role:** The REST API gateway between the frontend and the NELB agent.

Exposes three primary endpoints: `/api/agent/allocate` (Brain 1), `/api/agent/recall` (Brain 2), `/api/agent/assist` (Brain 3). Handles request validation, authentication headers, database session management, and error responses. Chosen because Python has the best Azure SDK and AI ecosystem.

`required`

---

### Python 3.11 — Core language
**Role:** The language the entire backend and reasoning engine is written in.

Powers the allocation engine logic (pure Python — no LLM), the memory query parser, the Semantic Kernel integration, and all Azure SDK calls. Python 3.11 specifically for the performance improvements and better async support.

`required`

---

### Pydantic v2 — Validation
**Role:** Validates all incoming API requests and outgoing responses.

Defines the shape of job allocation requests, worker candidate objects, memory queries, and reasoning trace responses. If the frontend sends a malformed request, Pydantic rejects it with a clear error before it reaches the reasoning engine. Also used for settings/config validation.

`required`

---

### Azure App Service — Hosting
**Role:** Hosts the FastAPI backend in the cloud.

Runs the Python server in a managed environment. Connects to Azure PostgreSQL and Azure Key Vault via managed identity — no credentials in environment variables. Microsoft-aligned for the submission, which is important for judges evaluating the Azure stack.

`required`

---

### Docker — Compose
**Role:** Local development environment.

Runs FastAPI + PostgreSQL together with a single `docker-compose up` command. Any judge or contributor can spin up the full stack locally without installing Python dependencies manually. The Dockerfile is also used by Azure App Service for deployment.

`required`

---

## AI Reasoning Core — Azure AI Foundry

### Azure AI Foundry — Required tool
**Role:** The runtime environment for the NELB reasoning agent.

Hosts the NELB agent project, manages model deployments (GPT-4o), provides the agent execution environment, and ties together all three brains into a single orchestrated agent. This is the core Microsoft tool required by the Reasoning Agents track — without it the submission does not qualify.

`track requirement`

---

### Azure AI Agent Service — In Foundry
**Role:** Manages the NELB agent's state, tool calls, and multi-step execution loops.

When a job allocation request arrives, the Agent Service orchestrates the sequence: call the allocation tool → get candidates → apply fairness rules → generate explanation. It maintains conversation context for the assistant brain so it can remember what job a worker is currently doing when answering questions.

`track requirement`

---

### GPT-4o — via Foundry
**Role:** Powers the assistant brain and natural language understanding.

Answers work-related questions for Brain 3 (tool advice, calculations, safety guidance). Also generates natural language explanations for allocation decisions when the structured explanation from the engine needs enriching. Deployed inside the Foundry project — not called via external API.

`required`

---

### Semantic Kernel — Python SDK
**Role:** Orchestration layer connecting FastAPI to Azure AI Foundry.

Defines the three NELB agent tools (allocation, memory, assistant) as Python functions decorated with `@kernel_function`. Manages the kernel that routes incoming queries to the right brain. Handles the tool-calling loop between GPT-4o and the Python logic — when GPT-4o decides to call the allocation tool, Semantic Kernel executes the Python function and returns the result.

`required`

---

## NELB Reasoning Engine — Custom Python Code

### Allocation engine — `app/services/allocation/`
**Role:** The 5-step reasoning pipeline that fairly distributes jobs.

Pure Python — no LLM involved. Runs: Skills filter → Reliability filter → Availability filter → Distance analysis (Haversine formula) → Fairness analysis (recent job count). Scores each worker on four weighted dimensions (skill 30%, reliability 25%, distance 25%, fairness 20%), ranks candidates, and generates a plain-language explanation of every decision. This is the heart of what makes NELB a reasoning agent.

`required`

---

### Memory service — `app/services/memory/`
**Role:** Parses natural language recall queries and searches job history.

Extracts intent from queries like "who did I tile a kitchen for last year?" — identifies category (tiling), year (last year), and optional name hints. Builds a SQLAlchemy query against the job_history table and returns structured results. Also calculates recent job counts per worker for the fairness engine.

`required`

---

### Assistant service — `app/services/assistant/`
**Role:** Routes work-related questions to GPT-4o with a constrained system prompt.

Prepends a strict system prompt limiting responses to civilian job categories (cleaning, tiling, painting, etc.). Injects the worker's current job context so GPT-4o can give relevant answers. Explicitly refuses to answer questions about licensed electrical, gas, or structural work. Returns the answer with a source tag (foundry vs demo mode).

`required`

---

### Explanation generator — inside `allocation/`
**Role:** Produces the human-readable reasoning trace shown in the demo UI.

After the 5-step pipeline runs, formats every decision into plain language: which workers were eliminated at each step and why, what each score was, why the recommended worker won, and who the next-best alternatives are. This output is what the demo video's "reasoning panel" screen shows — it is the visual proof of multi-step reasoning for judges.

`required`

---

## Database

### Azure PostgreSQL — v16
**Role:** The primary data store for the entire system.

Stores 6 tables: `workers` (profiles, skills, reliability scores), `clients` (employers), `jobs` (posted work), `allocations` (reasoning traces per job), `job_history` (completed work log — powers Brain 2), `reasoning_logs` (every agent decision audited). Microsoft-aligned, important for the submission.

`required`

---

### SQLAlchemy — Async v2
**Role:** Python ORM for all database operations.

Defines the data models (Worker, Job, Allocation, JobHistory etc.) as Python classes. Runs async queries so the API doesn't block while waiting for database responses. The memory service uses SQLAlchemy to build dynamic queries based on what keywords were extracted from the recall question.

`required`

---

### Alembic — Migrations
**Role:** Database schema versioning and migrations.

Tracks every change to the database schema in version files committed to the GitHub repo. Judges and contributors can recreate the exact database schema by running `alembic upgrade head`. Makes the project reproducible — a key requirement for a hackathon submission that will be evaluated.

`required`

---

## Maps & Geospatial

### Azure Maps — REST API
**Role:** Powers the radius scan and distance calculations.

Called by the allocation engine's distance analysis step to get accurate road-distance and travel time estimates between the job location and each worker. Also used on the frontend to render the interactive map with the scan radius circle. Microsoft-aligned — using Azure Maps instead of Google Maps strengthens the submission's Microsoft stack story.

`required`

---

### Haversine formula — In-engine
**Role:** Fast straight-line distance calculation built into the allocation engine.

Used for the initial radius filter before calling Azure Maps — avoids making an external API call for every worker candidate. Workers outside the calculated radius are eliminated immediately. Azure Maps is then called only for the shortlisted candidates to get precise travel times. Reduces cost and latency.

`required`

---

## Auth & Security

### Supabase Auth — v2
**Role:** Handles user authentication for both employers and workers.

Email/password and social login. Issues JWTs that the frontend sends with every API request. The FastAPI backend validates the JWT to identify whether the caller is a worker or employer, and loads the correct profile. Drop-in integration with Next.js via `@supabase/auth-helpers-nextjs`. Chosen for hackathon speed — avoids building auth from scratch.

`required`

---

### Azure Key Vault — Secrets
**Role:** Stores all API keys and credentials securely.

Holds the Azure Foundry connection string, Azure Maps key, and database credentials. The backend reads secrets at startup via managed identity — no credentials in environment variables or the codebase. Required for a credible production-pattern submission. Judges evaluating Reliability & Safety will look for this.

`recommended`

---

## Development Tooling

### GitHub Copilot — Required tool
**Role:** AI-assisted development of the entire codebase.

Used to scaffold the FastAPI routes, generate the SQLAlchemy models from the schema design, write the allocation engine unit tests, complete the Semantic Kernel tool definitions, and draft the README. Copilot's inline completions accelerate the hackathon timeline significantly. Its use is explicitly required by the contest and should be mentioned in the demo video.

`contest requirement`

---

### GitHub — Public repo
**Role:** Source code hosting — required by submission rules.

The public repository is a mandatory submission artefact. Contains the full codebase, the Mermaid architecture diagram in the README, Alembic migration files, Docker Compose setup, and the NELB system statement. Judges will inspect this directly.

`required`

---

### pytest — Unit tests
**Role:** Tests the allocation engine logic.

9 unit tests covering: correct candidate recommendation, skills filtering, reliability filtering, availability filtering, radius filtering, fairness penalty, general repair fallback, reasoning trace completeness, and no-candidate edge case. These tests prove to judges that the reasoning engine is real code with verifiable behaviour — not a prompt wrapper.

`required`

---

### structlog — Logging
**Role:** Structured JSON logging across the backend.

Every allocation decision, memory query, and assistant request is logged with structured fields (worker_id, job_category, confidence score, duration_ms). Logs are stored in the `reasoning_logs` table and also streamed to stdout for Azure App Service log monitoring. Makes the system auditable — relevant to the Reliability & Safety judging criterion.

`recommended`
