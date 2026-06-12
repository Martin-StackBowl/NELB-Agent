"""NELB Memory Service — Brain 2.

Parses natural language recall queries and searches job history.
Extracts intent (category, time period, client name hints, location hints),
queries the PostgreSQL job_history table, and returns structured results.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_history import JobHistory
from app.schemas.agent import RecallRequest, RecallResponse, JobRecord

# Job categories for intent matching
JOB_CATEGORIES = [
    "cleaning", "gardening", "painting", "plumbing",
    "electrical", "tiling", "carpentry", "moving", "general repair",
]


def parse_recall_intent(query: str) -> dict:
    """Extract intent from a natural language recall query.

    Returns a dict with optional keys: category, months_back, client_hint, location_hint.
    """
    query_lower = query.lower()
    intent: dict = {}

    # Category detection
    for cat in JOB_CATEGORIES:
        if cat in query_lower:
            intent["category"] = cat
            break

    # Also match verb forms
    verb_map = {
        "tile": "tiling", "tiled": "tiling",
        "paint": "painting", "painted": "painting",
        "clean": "cleaning", "cleaned": "cleaning",
        "garden": "gardening",
        "plumb": "plumbing",
        "electric": "electrical",
        "carpen": "carpentry",
        "mov": "moving", "pack": "moving",
        "repair": "general repair", "fix": "general repair", "fixed": "general repair",
    }
    if "category" not in intent:
        for verb, cat in verb_map.items():
            if verb in query_lower:
                intent["category"] = cat
                break

    # Time period detection
    if "last year" in query_lower:
        intent["months_back"] = 12
    elif "last month" in query_lower:
        intent["months_back"] = 1
    elif "last 3 months" in query_lower or "last three months" in query_lower:
        intent["months_back"] = 3
    elif "last 6 months" in query_lower or "last six months" in query_lower:
        intent["months_back"] = 6
    elif "this year" in query_lower:
        intent["months_back"] = datetime.now().month  # months since Jan
    elif "this month" in query_lower:
        intent["months_back"] = 0  # current month only

    # Rating query detection
    if "rating" in query_lower or "rated" in query_lower:
        intent["wants_rating"] = True

    # "Last" / "most recent" detection
    if "last job" in query_lower or "most recent" in query_lower or "latest" in query_lower:
        intent["limit"] = 1

    # "How many" detection
    if "how many" in query_lower or "count" in query_lower:
        intent["wants_count"] = True

    return intent


async def recall_memory(request: RecallRequest, db: AsyncSession) -> RecallResponse:
    """Parse query, search job history, return structured answer."""

    intent = parse_recall_intent(request.query)

    # Build query
    conditions = [JobHistory.worker_id == request.worker_id]

    if "category" in intent:
        conditions.append(JobHistory.category.ilike(f"%{intent['category']}%"))

    if "months_back" in intent:
        if intent["months_back"] == 0:
            # Current month
            start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = datetime.now(timezone.utc) - timedelta(days=intent["months_back"] * 30)
        conditions.append(JobHistory.completed_at >= start)

    query = select(JobHistory).where(and_(*conditions)).order_by(JobHistory.completed_at.desc())

    if "limit" in intent:
        query = query.limit(intent["limit"])

    result = await db.execute(query)
    records = list(result.scalars().all())

    # Format response
    job_records = [
        JobRecord(
            job_id=r.id,
            client_name=r.client_name,
            category=r.category,
            description=r.description,
            location=r.location,
            completed_at=r.completed_at.isoformat() if r.completed_at else "",
            rating=r.rating,
            notes=r.worker_notes,
        )
        for r in records
    ]

    # Generate natural language answer
    query_interpreted = f"Searching job history for worker"
    if "category" in intent:
        query_interpreted += f", category: {intent['category']}"
    if "months_back" in intent:
        query_interpreted += f", time: last {intent['months_back']} months"

    if intent.get("wants_count"):
        answer = f"You completed {len(records)} {intent.get('category', '')} job{'s' if len(records) != 1 else ''}"
        if "months_back" in intent:
            answer += f" in the last {intent['months_back']} months"
        answer += "."
    elif len(records) == 0:
        answer = "No matching jobs found in your history."
    elif len(records) == 1:
        r = records[0]
        answer = f"{r.client_name} — {r.category} at {r.location}, completed {r.completed_at.strftime('%B %Y') if r.completed_at else 'unknown date'}."
        if r.rating:
            answer += f" Rating: {r.rating}/5."
        if r.worker_notes:
            answer += f" Notes: {r.worker_notes}"
    else:
        answer = f"Found {len(records)} matching jobs:\n"
        for r in records[:10]:  # Show up to 10 in summary
            answer += f"• {r.client_name} — {r.category} at {r.location} ({r.completed_at.strftime('%b %Y') if r.completed_at else ''})\n"
        if len(records) > 10:
            answer += f"...and {len(records) - 10} more."

    return RecallResponse(
        answer=answer,
        records=job_records,
        query_interpreted=query_interpreted,
    )
