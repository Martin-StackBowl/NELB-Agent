"""NELB Agent — Semantic Kernel setup and Azure AI Foundry connection.

Configures the kernel with the o4-mini deployment and registers
the three NELB brain tools: allocate_job, recall_memory, work_assist.
"""

from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion

from app.config import settings


def create_kernel() -> Kernel:
    """Create and configure a Semantic Kernel instance connected to Azure AI Foundry."""

    kernel = Kernel()

    # Add the Azure OpenAI chat completion service (o4-mini via Foundry)
    chat_service = AzureChatCompletion(
        deployment_name=settings.azure_ai_foundry_deployment,
        endpoint=settings.azure_ai_foundry_endpoint,
        api_key=settings.azure_ai_foundry_api_key,
    )
    kernel.add_service(chat_service)

    return kernel


# Global kernel instance
nelb_kernel = create_kernel()
