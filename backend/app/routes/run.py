"""NELB Agent /run endpoint — unified natural language interface.

Accepts a message from the user (employer or worker). The Foundry agent (o4-mini)
decides which tool to call based on the message content:
- allocate_job (Brain 1) — job allocation requests
- recall_memory (Brain 2) — work history queries
- work_assist (Brain 3) — practical work questions

Coordinates are passed separately (from the frontend map picker) because
GPS cannot be reliably extracted from natural language.
"""

from uuid import UUID
from openai import AsyncAzureOpenAI
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas.agent import (
    AllocationRequest,
    AllocationResponse,
    JobLocation,
    RecallRequest,
    RecallResponse,
    AssistRequest,
    AssistResponse,
)
from app.services.allocation.engine import allocate_job
from app.services.memory.recall import recall_memory
from app.services.assistant.assist import work_assist

router = APIRouter()

# Tool definitions for o4-mini function calling
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "allocate_job",
            "description": "Find the best workers for a job. Use when an employer wants to post a job or find workers for a task. Extracts job category, description, and budget from the user's message.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_category": {
                        "type": "string",
                        "enum": ["cleaning", "gardening", "painting", "plumbing", "electrical", "tiling", "carpentry", "moving", "general repair"],
                        "description": "The category of work needed",
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the job from the user's message",
                    },
                    "budget": {
                        "type": "number",
                        "description": "Budget amount in local currency (ZAR). If not specified, use 0.",
                    },
                },
                "required": ["job_category", "description", "budget"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recall_memory",
            "description": "Query a worker's job history. Use when a worker asks about past jobs, clients, ratings, or work they've done before.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The natural language question about job history, passed directly to the memory service",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "work_assist",
            "description": "Answer a practical work-related question about tools, materials, techniques, safety, or calculations for civilian jobs (cleaning, gardening, painting, plumbing, electrical, tiling, carpentry, moving, repairs).",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The work-related question to answer",
                    },
                    "job_context": {
                        "type": "string",
                        "description": "Current job context if known, empty string otherwise",
                    },
                },
                "required": ["question"],
            },
        },
    },
]

AGENT_SYSTEM_PROMPT = """You are NELB (No Employee Left Behind), an intelligent reasoning agent for fair job distribution in community-level gig economies.

You have three capabilities (tools):
1. allocate_job — Find the best workers for a job. Use when someone wants to hire/find workers.
2. recall_memory — Look up a worker's job history. Use when someone asks about past work.
3. work_assist — Answer practical work questions about tools, materials, safety, techniques.

Rules:
- Always use the appropriate tool. Never answer job allocation or history questions from your own knowledge.
- For allocate_job: extract the job category, description, and budget from the message.
- For recall_memory: pass the user's question directly as the query.
- For work_assist: pass the question and any known job context.
- If the message doesn't fit any tool, respond helpfully explaining what NELB can do.
- Be concise. Don't repeat the full reasoning trace — just summarise the key recommendation.
"""


class RunRequest(BaseModel):
    message: str = Field(..., description="Natural language message from the user")
    latitude: float | None = Field(default=None, description="Employer latitude from map picker")
    longitude: float | None = Field(default=None, description="Employer longitude from map picker")
    radius_km: float = Field(default=5.0, description="Search radius in km")
    worker_id: str | None = Field(default=None, description="Worker ID for memory queries")
    job_context: str = Field(default="", description="Current job context for work assist")


class RunResponse(BaseModel):
    tool_used: str = Field(..., description="Which tool was invoked: allocate_job, recall_memory, work_assist, or none")
    response: str = Field(..., description="The agent's synthesised response")
    raw_result: dict | None = Field(default=None, description="Raw tool output for frontend rendering")


@router.post("/run", response_model=RunResponse)
async def run_agent(request: RunRequest, db: AsyncSession = Depends(get_db)):
    """Unified agent endpoint. Accepts natural language, agent decides which tool to call."""

    # Check Foundry is configured
    if not settings.azure_ai_foundry_endpoint or not settings.azure_ai_foundry_api_key:
        return RunResponse(
            tool_used="none",
            response="[Demo mode] Azure AI Foundry is not configured. Please set endpoint and key in .env.",
            raw_result=None,
        )

    import json

    # Call o4-mini with tool definitions
    client = AsyncAzureOpenAI(
        azure_endpoint=settings.azure_ai_foundry_endpoint,
        api_key=settings.azure_ai_foundry_api_key,
        api_version=settings.azure_ai_foundry_api_version,
    )

    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": request.message},
    ]

    try:
        response = await client.chat.completions.create(
            model=settings.azure_ai_foundry_deployment,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_completion_tokens=500,
        )

        choice = response.choices[0]

        # If the model wants to call a tool
        if choice.message.tool_calls:
            tool_call = choice.message.tool_calls[0]
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)

            # Execute the appropriate brain
            if tool_name == "allocate_job":
                # Need coordinates for allocation
                lat = request.latitude or -25.7479  # Default Pretoria
                lng = request.longitude or 28.2293

                alloc_request = AllocationRequest(
                    job_category=tool_args["job_category"],
                    description=tool_args.get("description", request.message),
                    budget=tool_args.get("budget", 0),
                    location=JobLocation(latitude=lat, longitude=lng, address=""),
                    radius_km=request.radius_km,
                )
                result = await allocate_job(alloc_request, db)

                # Have the agent summarise the result
                summary = await _summarise_result(client, tool_name, result.model_dump(), request.message)

                return RunResponse(
                    tool_used="allocate_job",
                    response=summary,
                    raw_result=result.model_dump(),
                )

            elif tool_name == "recall_memory":
                worker_id = request.worker_id or "00000000-0000-0000-0000-000000000000"
                recall_request = RecallRequest(
                    worker_id=UUID(worker_id),
                    query=tool_args.get("query", request.message),
                )
                result = await recall_memory(recall_request, db)

                return RunResponse(
                    tool_used="recall_memory",
                    response=result.answer,
                    raw_result=result.model_dump(),
                )

            elif tool_name == "work_assist":
                assist_request = AssistRequest(
                    worker_id=UUID(request.worker_id or "00000000-0000-0000-0000-000000000000"),
                    question=tool_args.get("question", request.message),
                    job_context=tool_args.get("job_context", request.job_context),
                )
                result = await work_assist(assist_request)

                return RunResponse(
                    tool_used="work_assist",
                    response=result.answer,
                    raw_result=result.model_dump(),
                )

        # No tool called — agent responds directly
        return RunResponse(
            tool_used="none",
            response=choice.message.content or "I'm not sure how to help with that. I can find workers for jobs, recall work history, or answer practical work questions.",
            raw_result=None,
        )

    except Exception as e:
        return RunResponse(
            tool_used="error",
            response=f"Agent error: {str(e)}",
            raw_result=None,
        )


async def _summarise_result(client: AsyncAzureOpenAI, tool_name: str, result: dict, original_message: str) -> str:
    """Have the agent synthesise a plain-language summary of the tool result."""
    import json

    summary_messages = [
        {
            "role": "system",
            "content": "You are NELB. Summarise this allocation result in 2-3 sentences. Mention the top recommended worker, their score, and key reason. Be concise.",
        },
        {
            "role": "user",
            "content": f"Original request: {original_message}\n\nAllocation result:\n{json.dumps(result, indent=2, default=str)[:3000]}",
        },
    ]

    try:
        response = await client.chat.completions.create(
            model=settings.azure_ai_foundry_deployment,
            messages=summary_messages,
            max_completion_tokens=200,
        )
        return response.choices[0].message.content or "Allocation complete. See the results below."
    except Exception:
        # Fallback to the engine's built-in explanation
        return result.get("explanation", "Allocation complete.")
