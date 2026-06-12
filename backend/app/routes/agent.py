"""NELB Agent API routes — allocation, recall, assist, and profile endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.agent import (
    AllocationRequest,
    AllocationResponse,
    RecallRequest,
    RecallResponse,
    AssistRequest,
    AssistResponse,
    ProfileRequest,
    ProfileResponse,
    RunRequest,
    RunResponse,
)
from app.services.allocation.engine import allocate_job
from app.services.memory.recall import recall_memory
from app.services.assistant.assist import work_assist
from app.services.profile.lookup import profile_lookup

router = APIRouter()


@router.post("/allocate", response_model=AllocationResponse)
async def allocate(request: AllocationRequest, db: AsyncSession = Depends(get_db)):
    """Brain 1 — Run the 5-step allocation pipeline and return top 5 ranked workers."""
    result = await allocate_job(request, db)
    return result


@router.post("/recall", response_model=RecallResponse)
async def recall(request: RecallRequest, db: AsyncSession = Depends(get_db)):
    """Brain 2 — Parse a natural language memory query and return job history records."""
    result = await recall_memory(request, db)
    return result


@router.post("/assist", response_model=AssistResponse)
async def assist(request: AssistRequest):
    """Brain 3 — Answer a work-related question using GPT-4o with constrained context."""
    result = await work_assist(request)
    return result


@router.post("/profile", response_model=ProfileResponse)
async def profile(request: ProfileRequest, db: AsyncSession = Depends(get_db)):
    """Brain 4 — Look up a worker's profile information from the database."""
    result = await profile_lookup(request, db)
    return result


@router.post("/run", response_model=RunResponse)
async def run(request: RunRequest, db: AsyncSession = Depends(get_db)):
    """Unified Agent — Natural language interface to all four brains using o4-mini orchestrator."""
    from app.services.agent.orchestrator import run_agent
    result = await run_agent(request, db)
    return result
