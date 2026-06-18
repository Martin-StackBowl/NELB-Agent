"""Allocation enrichment — uses Foundry IQ to explain allocation decisions.

After the Python engine makes an allocation decision, this module queries
the knowledge base to retrieve grounded context explaining the decision:
- With 2+ recommendations: why the winner beat the runner-up (decisive factor).
- With exactly 1 recommendation: why that worker qualifies (strongest factor).
"""

import httpx
import re
from app.config import settings
from app.schemas.agent import WorkerScore
from app.services.text_utils import make_snippet as _make_snippet


# Natural-language questions per factor, used to ground the explanation in the
# nelb-allocation-criteria knowledge base via Foundry IQ.
FACTOR_QUERIES = {
    "skill": "Why does skills matching determine worker recommendation priority in NELB's allocation system?",
    "reliability": "Why does reliability score matter for worker allocation in community gig economies?",
    "distance": "Why does distance affect worker recommendation priority for civilian workers?",
    "fairness": "Why does recent job count affect worker recommendation priority in NELB's fairness engine?",
    "budget": "Why does budget fit affect worker recommendation priority in NELB's allocation system?",
}

# Tie-break priority when several factors are equal (most meaningful first).
FACTOR_PRIORITY = ["skill", "reliability", "distance", "budget", "fairness"]


def find_decisive_factor(top_recommendations: list[WorkerScore]) -> tuple[str, str, float] | None:
    """Identify which factor made the biggest difference between winner and runner-up.

    Returns: (factor_name, natural_language_query, score_difference) or None
    """
    if len(top_recommendations) < 2:
        return None

    winner = top_recommendations[0]
    runner_up = top_recommendations[1]

    factors = {
        "skill": abs(winner.skill_score - runner_up.skill_score),
        "reliability": abs(winner.reliability_score - runner_up.reliability_score),
        "distance": abs(winner.distance_score - runner_up.distance_score),
        "fairness": abs(winner.fairness_score - runner_up.fairness_score),
        "budget": abs(winner.budget_score - runner_up.budget_score),
    }

    decisive_factor = max(factors, key=factors.get)
    score_diff = factors[decisive_factor]
    return (decisive_factor, FACTOR_QUERIES[decisive_factor], score_diff)


def find_strongest_factor(winner: WorkerScore) -> tuple[str, str]:
    """For a lone qualifier, pick the worker's strongest scoring dimension.

    Ties are broken by FACTOR_PRIORITY (skill > reliability > distance > budget > fairness),
    so the explanation lands on the most meaningful factor.

    Returns: (factor_name, natural_language_query)
    """
    scores = {
        "skill": winner.skill_score,
        "reliability": winner.reliability_score,
        "distance": winner.distance_score,
        "budget": winner.budget_score,
        "fairness": winner.fairness_score,
    }
    best = max(scores.values())
    # Among factors tied at the best score, take the highest-priority one.
    strongest = next(f for f in FACTOR_PRIORITY if scores[f] == best)
    return (strongest, FACTOR_QUERIES[strongest])


async def enrich_with_foundry_iq(
    top_recommendations: list[WorkerScore],
    base_explanation: str
) -> tuple[str, list[dict]]:
    """Enrich allocation explanation with Foundry IQ retrieved context.

    Returns: (enriched_explanation, citations)
    """
    if not settings.azure_search_endpoint or not settings.azure_ai_foundry_endpoint:
        return (base_explanation, [])

    if not top_recommendations:
        return (base_explanation, [])

    winner = top_recommendations[0]

    # Choose what to explain based on how many workers were recommended.
    if len(top_recommendations) == 1:
        factor, query = find_strongest_factor(winner)
        header = f"**Why {winner.worker_name} qualifies for this job:**"
    else:
        decisive_info = find_decisive_factor(top_recommendations)
        if not decisive_info:
            return (base_explanation, [])
        factor, query, score_diff = decisive_info
        # Skip enrichment if the difference is negligible (< 2%).
        if score_diff < 2.0:
            return (base_explanation, [])
        runner_up = top_recommendations[1]
        header = f"**Why {winner.worker_name} was prioritized over {runner_up.worker_name}:**"

    try:
        kb_chat_url = f"{settings.azure_ai_foundry_endpoint}openai/deployments/{settings.azure_ai_foundry_deployment_chat}/chat/completions"

        headers = {
            "Content-Type": "application/json",
            "api-key": settings.azure_ai_foundry_api_key,
        }

        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a NELB allocation system explainer. Provide concise explanations of allocation criteria based on the retrieved knowledge base. Keep answers under 100 words."
                },
                {"role": "user", "content": query},
            ],
            "max_tokens": 300,
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

        async with httpx.AsyncClient() as client:
            response = await client.post(
                kb_chat_url,
                headers=headers,
                json=payload,
                params={"api-version": settings.azure_ai_foundry_api_version},
                timeout=15.0,
            )

            if response.status_code != 200:
                print(f"[Enrichment] Foundry IQ error: {response.status_code}")
                return (base_explanation, [])

            result = response.json()
            message = result.get("choices", [{}])[0].get("message", {})
            enrichment_text = message.get("content", "")

            if not enrichment_text:
                return (base_explanation, [])

            # Extract which citations are actually used in the answer
            used_citations = set()
            for match in re.finditer(r'\[doc(\d+)\]', enrichment_text):
                used_citations.add(int(match.group(1)))

            citations = []
            context = message.get("context", {})
            if context and "citations" in context:
                doc_title_to_display = {}
                doc_title_to_content = {}
                display_idx = 1

                for i, c in enumerate(context["citations"], 1):
                    if i not in used_citations:
                        continue

                    content = c.get("content", "")
                    lines = content.strip().split("\n")
                    doc_title = "NELB Allocation Criteria"
                    for line in lines[:10]:
                        if line.startswith("## "):
                            doc_title = line[3:].strip()
                            break

                    if doc_title not in doc_title_to_display:
                        doc_title_to_display[doc_title] = display_idx
                        doc_title_to_content[doc_title] = _make_snippet(content)
                        display_idx += 1

                # Renumber citations in enrichment text to match unique documents
                azure_to_display = {}
                for i in used_citations:
                    content = context["citations"][i - 1].get("content", "")
                    lines = content.strip().split("\n")
                    doc_title = "NELB Allocation Criteria"
                    for line in lines[:10]:
                        if line.startswith("## "):
                            doc_title = line[3:].strip()
                            break
                    azure_to_display[i] = doc_title_to_display.get(doc_title, i)

                def renumber_citation(match):
                    azure_num = int(match.group(1))
                    return f"[doc{azure_to_display.get(azure_num, azure_num)}]"

                enrichment_text = re.sub(r'\[doc(\d+)\]', renumber_citation, enrichment_text)

                for doc_title, display_idx in sorted(doc_title_to_display.items(), key=lambda x: x[1]):
                    citations.append({
                        "index": display_idx,
                        "filename": doc_title,
                        "content": doc_title_to_content.get(doc_title, ""),
                    })

            enriched = f"{base_explanation}\n\n{header}\n{enrichment_text}"

            print(f"[Enrichment] Added context for factor: {factor} ({len(top_recommendations)} rec)")
            return (enriched, citations)

    except Exception as e:
        print(f"[Enrichment] Error: {str(e)}")
        return (base_explanation, [])
