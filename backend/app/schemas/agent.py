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
    budget: float = Field(..., ge=0, description="Budget in local currency (0 = unspecified)")
    location: JobLocation
    radius_km: float = Field(default=5.0, gt=0, le=50)
    exclude_worker_id: UUID | None = Field(default=None, description="Worker ID to exclude from allocation (self-exclusion)")


class WorkerScore(BaseModel):
    worker_id: UUID
    worker_name: str
    skill_score: float
    reliability_score: float
    distance_score: float
    fairness_score: float
    budget_score: float
    estimated_price: float
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
    citations: list[dict] = Field(default_factory=list, description="Foundry IQ citations explaining decisive factors")


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
    source: str = Field(default="foundry", description="'foundry_iq', 'foundry', or 'demo'")
    category: str = Field(default="", description="Detected topic category")
    citations: list[dict] = Field(default_factory=list, description="Source citations from knowledge base")


# --- Profile Lookup (Brain 4) ---

class ProfileRequest(BaseModel):
    worker_id: UUID


class ProfileResponse(BaseModel):
    worker_id: UUID
    name: str
    email: str
    phone: str
    skills: list[str]
    reliability_score: float
    latitude: float
    longitude: float
    address: str
    is_available: bool
    total_jobs: int
    recent_jobs_7d: int
    average_rating: float | None = None


# --- Unified Agent (Natural Language Interface) ---

class RunRequest(BaseModel):
    message: str = Field(..., description="Natural language message from user")
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None
    worker_id: UUID | None = None
    job_context: str = Field(default="", description="Optional job context")


class RunResponse(BaseModel):
    tool_used: str = Field(..., description="Which tool was called: allocate_job, recall_memory, work_assist, profile_lookup, or none")
    response: str = Field(..., description="Natural language response to the user")
    raw_result: AllocationResponse | RecallResponse | AssistResponse | ProfileResponse | None = Field(default=None, description="Raw result from the tool")
