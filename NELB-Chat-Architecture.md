# NELB Chat — How It Works

## The single chat interface

The Talk to NELB chat is a single natural-language interface that routes to four different reasoning systems depending on what you ask. You don't select a tool. You don't navigate to a different page. You just type.

---

## What happens when you send a message

Every message goes to **o4-mini** first. It reads your message, determines intent, extracts structured parameters from unstructured language, and selects the appropriate tool:

- Finding workers for a job → `allocate_job`
- Asking about past work → `recall_memory`
- Practical work question → `work_assist`
- Profile or stats question → `profile_lookup`

When you say *"I need someone to clean my yard, budget R500"*, o4-mini understands category (cleaning), budget (R500), and intent (find workers) — then passes structured parameters to the allocation engine. The language layer and the decision layer are separate.

---

## The four brains

### Brain 1 — Allocation Engine
A 6-step deterministic Python pipeline. No LLM in the decision path.

| Step | What it does |
|------|-------------|
| 1. Skills filter | Exact match scores 1.0; general-repair fallback 0.7 — blocked for electrical/plumbing |
| 2. Reliability filter | Base reliability score blended with average star rating (70/30) |
| 3. Availability filter | Unavailable workers excluded |
| 4. Distance analysis | Haversine formula with linear decay within the search radius |
| 5. Budget fit | Worker's expected price (from real job history or category baseline) vs stated budget |
| 6. Fairness analysis | Workers who've reached the recent-jobs threshold receive an escalating penalty |

Every elimination is logged. Every score is calculated. The result includes a full reasoning trace — which workers were eliminated at each step and why.

### Brain 2 — Memory Recall
Parses natural language intent (category, time period, context) and queries PostgreSQL directly. Returns structured job history records. No LLM in the retrieval path.

### Brain 3 — Work Assistant
Routes questions through Foundry IQ — Azure AI Search retrieves relevant chunks from 14 indexed knowledge documents, gpt-4o-mini answers using only the retrieved content, and citations are returned inline. If the knowledge base doesn't contain an answer, the system says so.

### Brain 4 — Profile Lookup
Direct database read. No generation involved. Worker stats, reliability score, ratings, availability — read from PostgreSQL and returned as structured data.

---

## The reasoning trace

When Brain 1 runs, the UI reveals the pipeline step by step — each filter animating in sequence as the engine works through the candidate pool. The number of candidates before and after each step is shown. The final explanation names the decisive factor between the top two candidates, grounded by Foundry IQ with a cited source.

This is not a summary of a decision. It is the decision, made visible.

---

## The demo sequence

Three messages. Three brains. One chat.

**Message 1:**
> *"I need a painter in Pretoria, budget R1200"*

Allocation Brain fires. The 6-step trace animates. Foundry IQ enriches the explanation with a cited source on why distance was the decisive factor.

**Message 2** (logged in as Thabo):
> *"Who did I tile for last year?"*

Memory Brain fires. Parses "tiling" + "last year". Queries job history. Returns the actual record: Mrs Dlamini, Centurion, completed approximately one year ago, 5-star rating.

**Message 3:**
> *"Which drill bit for a 6mm wall plug in brick?"*

Assistant Brain fires. Foundry IQ retrieves from the drill bits guide. Answer appears with an inline citation chip and a source card below.

---

## Why each brain is the right tool for its job

| What you're asking | What handles it | Why |
|---|---|---|
| Intent from natural language | o4-mini | Language understanding is the LLM's strength |
| Who gets the job | Python engine | Deterministic, testable, auditable — every run produces the same result |
| Your job history | PostgreSQL query | Structured data, structured query |
| Trade knowledge | Foundry IQ + gpt-4o-mini | Grounded retrieval with citations; constrained to indexed source material |
| Your profile stats | PostgreSQL direct read | No generation needed for a database lookup |

---

*Part of the NELB submission kit — Microsoft Agents League @ AI Skills Fest 2026, Reasoning Agents track.*
