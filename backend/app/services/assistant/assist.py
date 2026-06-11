"""NELB Work Assistant — Brain 3.

Routes work-related questions to o4-mini via Azure AI Foundry.
Uses AsyncAzureOpenAI which automatically sends the required api-version query param.
Strictly limited to civilian job categories — refuses licensed trade questions.
"""

from openai import AsyncAzureOpenAI

from app.config import settings
from app.schemas.agent import AssistRequest, AssistResponse

# Constrained system prompt for o4-mini
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
- Cite your reasoning — explain WHY a specific tool, material, or technique is correct.
- REFUSE to answer questions about: licensed electrical work (high voltage), gas fitting,
  structural engineering, roofing at height without scaffolding, asbestos removal, or any illegal activity.
- If the question is outside your allowed categories, say: "That's outside my expertise.
  For licensed trade work, please consult a qualified professional."
- Keep answers under 200 words unless a calculation requires more detail.
- Format answers clearly with bullet points where helpful.
"""

# Topics that should be refused before even calling the model
REFUSED_TOPICS = [
    "high voltage", "gas fitting", "structural engineer", "asbestos",
    "roof without scaffold", "illegal", "weapon", "drug",
]


async def work_assist(request: AssistRequest) -> AssistResponse:
    """Answer a work-related question via o4-mini through Azure AI Foundry."""

    question_lower = request.question.lower()

    # Safety check — refuse dangerous topics without calling the model
    for topic in REFUSED_TOPICS:
        if topic in question_lower:
            return AssistResponse(
                answer="That's outside my expertise. For licensed trade work, please consult a qualified professional.",
                source="safety_filter",
                category="refused",
            )

    # Check if Foundry is configured
    if not settings.azure_ai_foundry_endpoint or not settings.azure_ai_foundry_api_key:
        return AssistResponse(
            answer=f"[Demo mode] NELB would answer your question about: '{request.question}'. "
                   f"In production, this routes through o4-mini via Azure AI Foundry.",
            source="demo",
            category="demo",
        )

    # Build messages
    messages = [
        {"role": "system", "content": ASSISTANT_SYSTEM_PROMPT},
    ]

    if request.job_context:
        messages.append({
            "role": "system",
            "content": f"The worker is currently doing this job: {request.job_context}. "
                       f"Tailor your answer to their current work context.",
        })

    messages.append({"role": "user", "content": request.question})

    try:
        # Call o4-mini via Azure AI Foundry using the Azure OpenAI client.
        # AsyncAzureOpenAI automatically appends ?api-version=<version> to every
        # request — required by Azure endpoints (*.services.ai.azure.com).
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_ai_foundry_endpoint,
            api_key=settings.azure_ai_foundry_api_key,
            api_version=settings.azure_ai_foundry_api_version,
        )

        response = await client.chat.completions.create(
            model=settings.azure_ai_foundry_deployment,
            messages=messages,
            max_completion_tokens=500,
        )

        answer = response.choices[0].message.content or "No response generated."

        # Detect category from the question
        category = _detect_category(request.question)

        return AssistResponse(
            answer=answer,
            source="foundry",
            category=category,
        )

    except Exception as e:
        return AssistResponse(
            answer=f"I encountered an issue connecting to Azure AI Foundry: {str(e)}. "
                   f"Please try again in a moment.",
            source="error",
            category="error",
        )


def _detect_category(question: str) -> str:
    """Detect the work category from the question."""
    question_lower = question.lower()
    categories = {
        "cleaning": ["clean", "bleach", "mop", "scrub", "detergent"],
        "gardening": ["garden", "plant", "prune", "mow", "lawn", "hedge"],
        "painting": ["paint", "primer", "brush", "roller", "coat"],
        "plumbing": ["plumb", "pipe", "tap", "leak", "drain"],
        "electrical": ["electric", "wire", "switch", "socket", "plug"],
        "tiling": ["tile", "grout", "adhesive", "spacer"],
        "carpentry": ["wood", "saw", "nail", "screw", "furniture", "shelf"],
        "moving": ["move", "pack", "box", "lift", "carry"],
        "general": ["drill", "fix", "repair", "tool", "measure"],
    }

    for cat, keywords in categories.items():
        if any(kw in question_lower for kw in keywords):
            return cat

    return "general"
