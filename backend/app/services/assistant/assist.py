"""NELB Work Assistant — Brain 3.

Routes work-related questions through Foundry IQ knowledge base.
Uses Azure OpenAI with Azure AI Search data source integration.

Flow:
1. Question comes in
2. Safety filter checks for refused topics
3. Azure OpenAI retrieves from knowledge base (Azure AI Search)
4. Returns cited, grounded answer with source references

This satisfies the hackathon's mandatory Foundry IQ requirement.
"""

from openai import AsyncAzureOpenAI
from app.config import settings
from app.schemas.agent import AssistRequest, AssistResponse

# Topics that should be refused before even calling the agent
REFUSED_TOPICS = [
    "high voltage", "gas fitting", "structural engineer", "asbestos",
    "roof without scaffold", "illegal", "weapon", "drug",
]

SYSTEM_PROMPT = """You are NELB, a practical work assistant for civilian workers.

Answer questions about:
- Cleaning, Gardening, Painting, Basic plumbing, Basic electrical, Tiling, Carpentry, Moving, General repairs

Rules:
- Base your answer ONLY on the retrieved knowledge base content provided.
- If the knowledge base doesn't contain relevant information, say: "I don't have specific guidance on that in my knowledge base."
- Include citations using [doc1], [doc2] notation.
- Give practical, concise answers. Include safety precautions when relevant.
- Keep answers under 200 words. Use bullet points where helpful.
- REFUSE questions about licensed electrical (high voltage), gas fitting, structural engineering, or illegal activity.
"""


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
            display_index = 1
            
            if context and "citations" in context:
                for i, c in enumerate(context["citations"], 1):
                    if i not in used_citations:
                        continue
                    
                    content = c.get("content", "")
                    # Extract document title from content
                    lines = content.strip().split("\n")
                    doc_title = "trade-guide"
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
                    "content": "",  # We don't show preview in cards
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
