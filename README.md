# NELB — No Employee Left Behind

An intelligent reasoning agent for fair job distribution in community-level gig economies.

Built on **Microsoft Azure AI Foundry** | Orchestrated by **Semantic Kernel** | Developed with **GitHub Copilot**

**Track:** Reasoning Agents — Microsoft Agents League @ AI Skills Fest 2026

---

## Three Brains

1. **Allocation Brain** — 5-step reasoning pipeline (skills → reliability → availability → distance → fairness) returns top 5 worker recommendations with full reasoning trace
2. **Memory Brain** — Natural language job history recall ("Who did I tile for last year?")
3. **Assistant Brain** — Contextual work help powered by GPT-4o ("Which drill bit for a 6mm wall plug?")

## Quick Start

### Backend

```bash
cd backend
pip install -e ".[dev]"
cp .env.example .env
# Start PostgreSQL (via Docker or local)
docker-compose up db -d
# Run migrations
alembic upgrade head
# Seed demo data
python seed.py
# Start the API
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Full Stack (Docker)

```bash
docker-compose up
```

## Architecture

```
Frontend (Next.js) → FastAPI → Azure AI Foundry (Semantic Kernel)
                                    ↓
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             Allocation       Memory Brain    Assistant Brain
              Brain            (PostgreSQL)      (GPT-4o)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Leaflet, Zustand |
| Backend | FastAPI, Python 3.11, Pydantic v2 |
| AI | Azure AI Foundry, Semantic Kernel, GPT-4o |
| Database | Azure PostgreSQL, SQLAlchemy, Alembic |
| Auth | Supabase Auth |
| Maps | Azure Maps, React Leaflet |
| Hosting | Vercel (frontend), Azure App Service (backend) |

---

*No employee left behind is not just a name — it is the operating principle of every algorithm in the system.*
