"""NELB Work Assistant — Brain 3.

Routes work-related questions through a Foundry AI Agent backed by the
knowledge base indexed in Azure AI Search (Foundry IQ).

Flow:
1. Question comes in
2. Safety filter checks for refused topics
3. If a Foundry Agent ID is configured → call the Azure AI Agent Service
   (thread + run pattern — the agent handles retrieval and citations)
4. Otherwise → fall back to raw Azure OpenAI + data_sources pattern
5. Returns cited, grounded answer with source references

The Foundry Agent approach is the primary path for the hackathon demo
because it uses the agent created in Azure AI Foundry with the knowledge
base attached there, satisfying the Foundry IQ requirement visibly.
"""

import re
import json
import httpx
from openai import AsyncAzureOpenAI
from app.config import settings
from app.schemas.agent import AssistRequest, AssistResponse
from app.services.text_utils import make_snippet as _make_snippet

REFUSED_TOPICS = [
    "high voltage", "gas fitting", "structural engineer", "asbestos",
    "roof without scaffold", "illegal", "weapon", "drug",
]

# System prompt for Work Assistant Brain - comprehensive anti-hallucination version
SYSTEM_PROMPT = """You are NELB's Work Assistant Brain — a practical, grounded buddy for civilian workers on the job.

Answer questions about:
- Cleaning, Gardening, Painting, Basic plumbing, Basic electrical, Tiling, Carpentry, Moving, General repairs
- NELB system information: what NELB is, what services it offers, pricing guidance, how it works, its capabilities
- Materials estimation calculations: cement bags, paint coverage, tile counts, adhesive quantities

Rules:

1. **Answer ONLY from the retrieved knowledge base content.** If the KB doesn't contain the answer, say exactly: "I don't have specific guidance on that in my knowledge base."

2. **Always cite sources using [doc1], [doc2] notation inline** — never at the end only.

3. **For NELB system questions** (what NELB is, services, capabilities, how it works):
   - Provide clear, concise overviews with citations
   - List the four brains when explaining capabilities
   - Include pricing ranges when discussing budgets

4. **For pricing/budget questions:**
   - Provide the category price range (e.g., "Cleaning R300-600")
   - Explain what factors affect pricing
   - **CRITICAL:** Never apply an example's exact price to a different scenario
   - Always reason from the category range and adjust for specifics

5. **For calculations** (materials estimation):
   - Identify the values provided by the user
   - Show the formula from the knowledge base
   - Substitute the user's values into the formula
   - Show calculation step-by-step
   - State final answer clearly with units
   - **CRITICAL:** Never reuse example values from the knowledge base. Always use the values supplied by the user
   - If values are missing, ask for them instead of guessing

6. **For procedures:** Use numbered steps, include safety precautions at the start

7. **For safety questions:** Lead with the safety rule, then provide detail, always cite source

8. **Keep answers under 200 words** unless a calculation or procedure requires more

9. **Use bullet points** for lists of items, tools, materials, or rules

10. **REFUSE questions about:**
    - High-voltage electrical (beyond basic socket/switch)
    - Gas fitting or gas plumbing
    - Structural engineering or load-bearing modifications
    - Asbestos removal
    - Roofing at height without scaffolding
    - Any illegal activity
    - Say exactly: "That requires a licensed professional — outside NELB's scope."

11. **Never invent** specifications, measurements, safety rules, pricing, or capabilities not in the retrieved content
"""


async def work_assist(request: AssistRequest) -> AssistResponse:
    """Answer a work-related question via the Foundry AI Agent (Brain 3)."""

    question_lower = request.question.lower()

    for topic in REFUSED_TOPICS:
        if topic in question_lower:
            return AssistResponse(
                answer="That's outside my expertise. For licensed trade work, please consult a qualified professional.",
                source="safety_filter",
                category="refused",
            )

    if not settings.azure_ai_foundry_endpoint or not settings.azure_ai_foundry_api_key:
        return AssistResponse(
            answer="[Demo mode] Foundry IQ not configured.",
            source="demo",
            category="demo",
        )

    # Primary path: data_sources pattern (Azure OpenAI + Azure AI Search)
    # This IS Foundry IQ — retrieves from your indexed knowledge base with citations.
    return await _call_with_data_sources(request)


async def _call_foundry_agent(request: AssistRequest) -> AssistResponse:
    """Call the Foundry AI Agent via azure-ai-projects SDK (Responses API pattern)."""
    import asyncio
    from azure.identity import DefaultAzureCredential
    from azure.ai.projects import AIProjectClient
    from azure.ai.projects.models import VersionRefIndicator

    agent_name = settings.azure_foundry_agent_name
    agent_version = settings.azure_foundry_agent_version
    endpoint = settings.azure_foundry_agent_endpoint
    # Use a stable isolation key per request
    isolation_key = f"nelb-brain3-{request.worker_id}"

    print(f"[Brain 3] Calling Foundry Agent: {agent_name} v{agent_version}")

    def _run_sync():
        """Run the synchronous SDK calls in a thread so we don't block the event loop."""
        with (
            DefaultAzureCredential() as credential,
            AIProjectClient(
                endpoint=endpoint,
                credential=credential,
                allow_preview=True,
            ) as project_client,
        ):
            session = project_client.beta.agents.create_session(
                agent_name=agent_name,
                isolation_key=isolation_key,
                version_indicator=VersionRefIndicator(agent_version=agent_version),
            )
            print(f"[Brain 3] Session: {session.agent_session_id}")
            try:
                openai_client = project_client.get_openai_client(agent_name=agent_name)
                response = openai_client.responses.create(
                    input=request.question,
                    extra_body={"agent_session_id": session.agent_session_id},
                )
                return response.output_text or ""
            finally:
                project_client.beta.agents.delete_session(
                    agent_name=agent_name,
                    session_id=session.agent_session_id,
                    isolation_key=isolation_key,
                )

    # Run the blocking SDK calls in a thread pool
    loop = asyncio.get_event_loop()
    raw_answer = await loop.run_in_executor(None, _run_sync)

    print(f"[Brain 3] Agent answer: {raw_answer[:200]}...")

    # Clean any trailing citation lines Azure may append
    lines = raw_answer.split("\n")
    cleaned = [l for l in lines if not re.match(r'^\d+\|.*\|.*$', l.strip())]
    answer = "\n".join(cleaned).strip()

    # Extract [doc1] style citations from the answer
    used = set(int(m.group(1)) for m in re.finditer(r'\[doc(\d+)\]', answer))
    citations = [{"index": i, "filename": f"NELB Knowledge Base", "content": ""} for i in sorted(used)]

    return AssistResponse(
        answer=answer,
        source="foundry_agent",
        category=_detect_category(request.question),
        citations=citations,
    )


async def _call_with_data_sources(request: AssistRequest) -> AssistResponse:
    """Fallback: raw Azure OpenAI chat completions with Azure AI Search data_sources."""

    if not settings.azure_search_endpoint:
        return await _fallback_direct(request, "No search endpoint configured")

    try:
        kb_chat_url = (
            f"{settings.azure_ai_foundry_endpoint}openai/deployments/"
            f"{settings.azure_ai_foundry_deployment_chat}/chat/completions"
        )
        headers = {
            "Content-Type": "application/json",
            "api-key": settings.azure_ai_foundry_api_key,
        }
        payload = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.question},
            ],
            "max_tokens": 500,
            "data_sources": [
                {
                    "type": "azure_search",
                    "parameters": {
                        "endpoint": settings.azure_search_endpoint,
                        "index_name": settings.azure_search_knowledge_base,
                        "authentication": {
                            "type": "api_key",
                            "key": settings.azure_search_key,
                        },
                    },
                }
            ],
        }

        print(f"[Brain 3] Falling back to data_sources pattern")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                kb_chat_url,
                headers=headers,
                json=payload,
                params={"api-version": settings.azure_ai_foundry_api_version},
                timeout=30.0,
            )

            if response.status_code != 200:
                raise Exception(f"KB API error: {response.status_code} - {response.text}")

            result = response.json()
            message = result.get("choices", [{}])[0].get("message", {})
            raw_answer = message.get("content", "No answer generated.")

            # Clean raw citation lines
            lines = raw_answer.split("\n")
            cleaned = [l for l in lines if not re.match(r'^\d+\|.*\|.*$', l.strip())]
            answer = "\n".join(cleaned).strip()

            # Extract citations
            used_citations = set(int(m.group(1)) for m in re.finditer(r'\[doc(\d+)\]', answer))
            context = message.get("context", {})
            azure_to_doc_title = {}
            doc_title_to_display = {}
            doc_title_to_content = {}
            display_index = 1

            if context and "citations" in context:
                for i, c in enumerate(context["citations"], 1):
                    if i not in used_citations:
                        continue
                    content = c.get("content", "")
                    doc_title = "trade-guide"
                    for line in content.strip().split("\n")[:5]:
                        if line.startswith("# "):
                            doc_title = line[2:].strip()
                            break
                        elif line.startswith("## "):
                            doc_title = line[3:].strip()
                            break
                    azure_to_doc_title[i] = doc_title
                    if doc_title not in doc_title_to_display:
                        doc_title_to_display[doc_title] = display_index
                        doc_title_to_content[doc_title] = _make_snippet(content)
                        display_index += 1

            azure_to_display = {
                k: doc_title_to_display[v] for k, v in azure_to_doc_title.items()
            }

            def renumber(match):
                return f"[doc{azure_to_display.get(int(match.group(1)), int(match.group(1)))}]"

            answer = re.sub(r'\[doc(\d+)\]', renumber, answer)

            citation_details = [
                {"index": idx, "filename": title, "content": doc_title_to_content.get(title, "")}
                for title, idx in sorted(doc_title_to_display.items(), key=lambda x: x[1])
            ]

            return AssistResponse(
                answer=answer,
                source="foundry_iq",
                category=_detect_category(request.question),
                citations=citation_details,
            )

    except Exception as e:
        print(f"[Brain 3] data_sources error: {e}")
        return await _fallback_direct(request, str(e))


async def _fallback_direct(request: AssistRequest, error: str) -> AssistResponse:
    """Last resort: answer via o4-mini directly without knowledge base."""
    if not settings.azure_ai_foundry_api_key:
        return AssistResponse(answer=f"Foundry IQ error: {error}", source="error", category="error")

    try:
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_ai_foundry_endpoint,
            api_key=settings.azure_ai_foundry_api_key,
            api_version=settings.azure_ai_foundry_api_version,
        )
        response = await client.chat.completions.create(
            model=settings.azure_ai_foundry_deployment,
            messages=[
                {"role": "system", "content": "You are NELB, a practical work assistant. Answer concisely about tools, materials, techniques, and safety for civilian trade work. Under 200 words."},
                {"role": "user", "content": request.question},
            ],
            max_completion_tokens=500,
        )
        return AssistResponse(
            answer=response.choices[0].message.content or "No answer generated.",
            source="fallback",
            category=_detect_category(request.question),
        )
    except Exception as fallback_error:
        return AssistResponse(
            answer=f"Error: {error}. Fallback error: {str(fallback_error)}",
            source="error",
            category="error",
        )


def _detect_category(question: str) -> str:
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



async def work_assist(request: AssistRequest) -> AssistResponse:
    """Answer a work-related question via Foundry IQ knowledge base agent."""

    question_lower = request.question.lower()

    # Safety check — refuse dangerous topics
    for topic in REFUSED_TOPICS:
        if topic in question_lower:
            return AssistResponse(
                answer="That's outside my expertise. For licensed trade work, please consult a qualified professional.",
                source="safety_filter",
                category="refused",
            )

    if not settings.azure_ai_foundry_endpoint or not settings.azure_search_endpoint:
        return AssistResponse(
            answer="[Demo mode] Foundry IQ not configured.",
            source="demo",
            category="demo",
        )

    try:
        import httpx
        import json

        # Azure AI Foundry knowledge base uses extensions API
        kb_chat_url = f"{settings.azure_ai_foundry_endpoint}openai/deployments/{settings.azure_ai_foundry_deployment_chat}/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
            "api-key": settings.azure_ai_foundry_api_key,
        }
        
        # Use Azure AI Search as data source (on your own data pattern)
        payload = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.question},
            ],
            "max_tokens": 500,
            "data_sources": [
                {
                    "type": "azure_search",
                    "parameters": {
                        "endpoint": settings.azure_search_endpoint,
                        "index_name": settings.azure_search_knowledge_base,
                        "authentication": {
                            "type": "api_key",
                            "key": settings.azure_search_key,
                        },
                    },
                }
            ],
        }
        
        print(f"[Brain 3] Calling Azure OpenAI with Search data source")
        print(f"[Brain 3] URL: {kb_chat_url}")
        print(f"[Brain 3] Index: {settings.azure_search_knowledge_base}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                kb_chat_url,
                headers=headers,
                json=payload,
                params={"api-version": settings.azure_ai_foundry_api_version},
                timeout=30.0,
            )
            
            print(f"[Brain 3] Status: {response.status_code}")
            
            if response.status_code != 200:
                error_detail = response.text
                print(f"[Brain 3] Error response: {error_detail}")
                raise Exception(f"Knowledge base API error: {response.status_code} - {error_detail}")
            
            result = response.json()
            print(f"[Brain 3] Response keys: {list(result.keys())}")
            print(f"[Brain 3] Full result structure: {json.dumps(result, indent=2)[:1000]}...")
            
            # Extract answer and citations
            message = result.get("choices", [{}])[0].get("message", {})
            raw_answer = message.get("content", "No answer generated.")
            
            print(f"[Brain 3] Raw answer length: {len(raw_answer)}")
            print(f"[Brain 3] Raw answer preview: {raw_answer[:300]}...")
            print(f"[Brain 3] Raw answer end: ...{raw_answer[-300:]}")
            
            # Clean up raw citation markers that Azure appends at the end
            # Pattern: lines like "1|📄 Title|source" or just "1|Title|source"
            import re
            lines = raw_answer.split("\n")
            cleaned_lines = []
            
            for line in lines:
                stripped = line.strip()
                # Match citation pattern: starts with digit(s), has pipes, may have emoji
                if re.match(r'^\d+\|.*\|.*$', stripped):
                    print(f"[Brain 3] Skipping citation line: {stripped}")
                    continue
                cleaned_lines.append(line)
            
            answer = "\n".join(cleaned_lines).strip()
            
            # Extract which citations are actually used in the answer
            import re
            used_citations = set()
            for match in re.finditer(r'\[doc(\d+)\]', answer):
                used_citations.add(int(match.group(1)))
            
            print(f"[Brain 3] Citations used in answer: {sorted(used_citations)}")
            
            # First pass: extract all documents and deduplicate by title
            context = message.get("context", {})
            azure_to_doc_title = {}  # Azure index -> document title
            doc_title_to_display = {}  # Document title -> display index
            doc_title_to_content = {}  # Document title -> preview snippet
            display_index = 1
            
            if context and "citations" in context:
                print(f"[Brain 3] Raw citation count: {len(context['citations'])}")
                if context["citations"]:
                    print(f"[Brain 3] First citation keys: {list(context['citations'][0].keys())}")
                for i, c in enumerate(context["citations"], 1):
                    if i not in used_citations:
                        continue
                    
                    # Azure "on your data" citation objects vary in field naming.
                    content = (
                        c.get("content")
                        or c.get("text")
                        or c.get("chunk")
                        or c.get("snippet")
                        or ""
                    )
                    # Extract document title from content or explicit title field
                    lines = content.strip().split("\n")
                    doc_title = (c.get("title") or "").strip() or "trade-guide"
                    for line in lines[:5]:
                        if line.startswith("# "):
                            doc_title = line[2:].strip()
                            break
                        elif line.startswith("## "):
                            doc_title = line[3:].strip()
                            break
                    
                    azure_to_doc_title[i] = doc_title
                    
                    # Assign display index only to unique documents
                    if doc_title not in doc_title_to_display:
                        doc_title_to_display[doc_title] = display_index
                        doc_title_to_content[doc_title] = _make_snippet(content, drop_title=doc_title)
                        display_index += 1
            
            # Build azure index -> display index mapping
            azure_to_display = {}
            for azure_idx, doc_title in azure_to_doc_title.items():
                azure_to_display[azure_idx] = doc_title_to_display[doc_title]
            
            print(f"[Brain 3] Azure to display mapping: {azure_to_display}")
            print(f"[Brain 3] Unique documents: {doc_title_to_display}")
            
            # Renumber citations in answer to match unique documents
            def renumber_citation(match):
                azure_num = int(match.group(1))
                return f"[doc{azure_to_display.get(azure_num, azure_num)}]"
            
            answer = re.sub(r'\[doc(\d+)\]', renumber_citation, answer)
            
            # Build citation cards (one per unique document)
            citations = []
            citation_details = []
            for doc_title, display_idx in sorted(doc_title_to_display.items(), key=lambda x: x[1]):
                citation_details.append({
                    "index": display_idx,
                    "filename": doc_title,
                    "content": doc_title_to_content.get(doc_title, ""),
                })
                citations.append(doc_title)
            
            print(f"[Brain 3] Final {len(citation_details)} unique citation cards")
            
            source = "foundry_iq"
            category = _detect_category(request.question)

            return AssistResponse(
                answer=answer,
                source=source,
                category=category,
                citations=citation_details,
            )

    except Exception as e:
        print(f"[Brain 3] Error: {str(e)}")
        return await _fallback_direct(request, str(e))


async def _fallback_direct(request: AssistRequest, error: str) -> AssistResponse:
    """Fallback: answer via o4-mini directly without knowledge base."""
    if not settings.azure_ai_foundry_api_key:
        return AssistResponse(
            answer=f"Foundry IQ error: {error}",
            source="error",
            category="error",
        )

    try:
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_ai_foundry_endpoint,
            api_key=settings.azure_ai_foundry_api_key,
            api_version=settings.azure_ai_foundry_api_version,
        )

        response = await client.chat.completions.create(
            model=settings.azure_ai_foundry_deployment,
            messages=[
                {"role": "system", "content": "You are NELB, a practical work assistant for civilian workers. Give concise answers about tools, materials, techniques, and safety for cleaning, gardening, painting, plumbing, electrical, tiling, carpentry, moving, and general repairs. Keep under 200 words."},
                {"role": "user", "content": request.question},
            ],
            max_completion_tokens=500,
        )
        answer = response.choices[0].message.content or "No answer generated."
        return AssistResponse(answer=answer, source="fallback", category=_detect_category(request.question))
    except Exception as fallback_error:
        return AssistResponse(
            answer=f"Knowledge base error: {error}. Fallback error: {str(fallback_error)}",
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

