"""NELB Work Assistant — Brain 3.

Routes work-related questions to GPT-4o with a constrained system prompt.
Strictly limited to civilian job categories — refuses licensed trade questions.

In demo mode (no Foundry connection), returns a placeholder response.
When Azure AI Foundry is configured, routes through GPT-4o.
"""

from app.config import settings
from app.schemas.agent import AssistRequest, AssistResponse

# Constrained system prompt for GPT-4o
ASSISTANT_SYSTEM_PROMPT = """You are NELB, a practical work assistant for civilian workers.
You help with tasks in these categories ONLY:
- Cleaning (domestic and commercial light cleaning)
- Gardening and yard work
- Painting (interior and exterior)
- Basic plumbing (NOT licensed high-pressure or gas work)
- Basic electrical (NOT licensed high-voltage work)
- Tiling (floors and walls)
- Carpentry (furniture assembly, basic woodwork)
- Moving and packing
- General repairs and handyman tasks

Rules:
- Give practical, concise answers about tools, materials, techniques, safety, and calculations.
- Always include safety precautions when relevant.
- REFUSE to answer questions about: licensed electrical work (high voltage), gas fitting,
  structural engineering, roofing at height without scaffolding, asbestos removal, or any illegal activity.
- If the question is outside your allowed categories, say: "That's outside my expertise.
  For licensed trade work, please consult a qualified professional."
- Keep answers under 200 words unless a calculation requires more detail.
"""

# Topics that should be refused
REFUSED_TOPICS = [
    "high voltage", "gas fitting", "structural engineer", "asbestos",
    "roof without scaffold", "illegal", "weapon", "drug",
]


async def work_assist(request: AssistRequest) -> AssistResponse:
    """Answer a work-related question.

    If Azure AI Foundry is configured, routes through GPT-4o.
    Otherwise returns a demo-mode placeholder.
    """

    question_lower = request.question.lower()

    # Safety check — refuse dangerous topics regardless of mode
    for topic in REFUSED_TOPICS:
        if topic in question_lower:
            return AssistResponse(
                answer="That's outside my expertise. For licensed trade work, please consult a qualified professional.",
                source="safety_filter",
                category="refused",
            )

    # Check if Foundry is configured
    if settings.azure_ai_foundry_endpoint and settings.azure_ai_foundry_api_key:
        # TODO: Route through Azure AI Foundry / Semantic Kernel in Phase 6
        # For now, return a placeholder that indicates Foundry integration pending
        return AssistResponse(
            answer=f"[Foundry integration pending] Your question: '{request.question}' would be answered by GPT-4o with job context: '{request.job_context}'",
            source="foundry_pending",
            category="pending",
        )
    else:
        # Demo mode — return a helpful placeholder
        return AssistResponse(
            answer=f"[Demo mode] NELB would answer your question about: '{request.question}'. "
                   f"In production, this routes through GPT-4o via Azure AI Foundry with your current job context.",
            source="demo",
            category="demo",
        )
