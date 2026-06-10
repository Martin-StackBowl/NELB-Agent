"""Pydantic schemas for NELB agent API requests and responses."""

from pydantic import BaseModel, Field
from uuid import UUID


# --- Allocation (Brain 1) ---

class JobLocation(BaseModel):
    latitude: float
    longitude: float
    address: str = ""


class AllocationRequest(BaseModel):
    job_category: str = Field(..., description="Job category, e.g. 'cleaning', 'painting', 'tiling'")
    description: str = Field(..., description="Job description from the employer")
    budget: float = Field(..., gt=0, description="Budget in local currency")
    location: JobLocation
    radius_km: float = Field(default=5.0, gt=0, le=50)


class WorkerScore(BaseModel):
    worker_id: UUID
    worker_name: str
    skill_score: float
    reliability_score: float
    distance_score: float
    fairness_score: float
    composite_score: float
    distance_km: float
    skills: list[str]
    recent_jobs_7d: int


class ReasoningStep(BaseModel):
    step: int
    name: str
    description: str
    candidates_before: int
    candidates_after: int
    eliminated: list[str] = []


class AllocationResponse(BaseModel):
    recommendations: list[WorkerScore]
    reasoning_trace: list[ReasoningStep]
    explanation: str
    confidence: float
    total_candidates_evaluated: int


# --- Memory Recall (Brain 2) ---

class RecallRequest(BaseModel):
    worker_id: UUID
    query: str = Field(..., description="Natural language question about job history")


class JobRecord(BaseModel):
    job_id: UUID
    client_name: str
    category: str
    description: str
    location: str
    completed_at: str
    rating: float | None = None
    notes: str = ""


class RecallResponse(BaseModel):
    answer: str
    records: list[JobRecord]
    query_interpreted: str


# --- Work Assistant (Brain 3) ---

class AssistRequest(BaseModel):
    worker_id: UUID
    question: str = Field(..., description="Work-related question")
    job_context: str = Field(default="", description="Current job the worker is doing, for relevant answers")


class AssistResponse(BaseModel):
    answer: str
    source: str = Field(default="foundry", description="'foundry' or 'demo'")
    category: str = Field(default="", description="Detected topic category")
