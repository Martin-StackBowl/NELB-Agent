"""NELB Agent Tools — Semantic Kernel function definitions for the three brains.

These are the tools the NELB agent can call:
1. allocate_job — Brain 1 (fair job distribution)
2. recall_memory — Brain 2 (work history recall)
3. work_assist — Brain 3 (contextual job help via Foundry IQ)
"""

from semantic_kernel.functions import kernel_function

from app.agent.kernel import nelb_kernel


class NELBAllocationPlugin:
    """Brain 1 — The Allocation Brain."""

    @kernel_function(
        name="allocate_job",
        description="Run the 5-step allocation pipeline to find the best workers for a job. "
                    "Takes job category, description, budget, location (lat/lng), and radius. "
                    "Returns top 5 ranked workers with reasoning trace and composite scores.",
    )
    async def allocate_job(
        self,
        job_category: str,
        description: str,
        budget: float,
        latitude: float,
        longitude: float,
        address: str = "",
        radius_km: float = 5.0,
    ) -> str:
        """Allocation is handled directly by the Python engine — this is the SK wrapper."""
        # The actual allocation runs in the route handler with DB access.
        # This plugin definition exists for the agent's tool registry.
        return "ALLOCATION_TOOL_CALLED"


class NELBMemoryPlugin:
    """Brain 2 — The Memory Brain."""

    @kernel_function(
        name="recall_memory",
        description="Query a worker's job history using natural language. "
                    "Parses intent (category, time period, client name) and returns matching records.",
    )
    async def recall_memory(
        self,
        worker_id: str,
        query: str,
    ) -> str:
        """Memory recall is handled directly by the service — this is the SK wrapper."""
        return "RECALL_TOOL_CALLED"


class NELBAssistantPlugin:
    """Brain 3 — The Work Assistant Brain (powered by o4-mini + Foundry IQ)."""

    @kernel_function(
        name="work_assist",
        description="Answer a practical work-related question for a civilian worker. "
                    "Topics: cleaning, gardening, painting, plumbing, electrical, tiling, "
                    "carpentry, moving, general repairs. Provides cited, grounded answers. "
                    "Refuses licensed trade work, gas fitting, structural engineering questions.",
    )
    async def work_assist(
        self,
        question: str,
        job_context: str = "",
    ) -> str:
        """Work assistance routes through o4-mini with constrained system prompt."""
        from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
        from semantic_kernel.contents import ChatHistory

        chat_history = ChatHistory()
        chat_history.add_system_message(ASSISTANT_SYSTEM_PROMPT)

        if job_context:
            chat_history.add_system_message(
                f"The worker is currently doing this job: {job_context}. "
                f"Tailor your answer to their current work context."
            )

        chat_history.add_user_message(question)

        # Get the chat service from the kernel
        chat_service = nelb_kernel.get_service(type=AzureChatCompletion)
        response = await chat_service.get_chat_message_content(
            chat_history=chat_history,
        )

        return str(response)


# Constrained system prompt for the work assistant
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


def register_plugins():
    """Register all NELB plugins with the kernel."""
    nelb_kernel.add_plugin(NELBAllocationPlugin(), plugin_name="allocation")
    nelb_kernel.add_plugin(NELBMemoryPlugin(), plugin_name="memory")
    nelb_kernel.add_plugin(NELBAssistantPlugin(), plugin_name="assistant")


# Register on import
register_plugins()
