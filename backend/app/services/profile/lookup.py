"""NELB Profile Lookup — Brain 4.

Retrieves worker profile information directly from PostgreSQL.
Used when the agent needs to answer questions about the logged-in worker's
own profile: skills, reliability score, availability, location, job stats.

This is NOT a Foundry IQ query — profile data is structured and lives
in the database. The agent reasons about which tool to use:
- Trade knowledge → Foundry IQ (Brain 3)
- Job history → Memory recall (Brain 2)
- Profile/stats → Direct DB lookup (Brain 4)
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.worker import Worker
from app.models.job_history import JobHistory
from app.schemas.agent import ProfileRequest, ProfileResponse
from app.config import settings


async def profile_lookup(request: ProfileRequest, db: AsyncSession) -> ProfileResponse:
    """Look up a worker's full profile from the database."""

    # Fetch worker
    result = await db.execute(
        select(Worker).where(Worker.id == request.worker_id)
    )
    worker = result.scalar_one_or_none()

    if not worker:
        return ProfileResponse(
            worker_id=request.worker_id,
            name="Unknown",
            email="",
            phone="",
            skills=[],
            reliability_score=0.0,
            latitude=0.0,
            longitude=0.0,
            address="",
            is_available=False,
            total_jobs=0,
            recent_jobs_7d=0,
            average_rating=None,
        )

    # Count total jobs
    total_result = await db.execute(
        select(func.count(JobHistory.id))
        .where(JobHistory.worker_id == worker.id)
    )
    total_jobs = total_result.scalar() or 0

    # Count recent jobs (last 7 days)
    fairness_window = datetime.now(timezone.utc) - timedelta(days=settings.fairness_window_days)
    recent_result = await db.execute(
        select(func.count(JobHistory.id))
        .where(JobHistory.worker_id == worker.id)
        .where(JobHistory.completed_at >= fairness_window)
    )
    recent_jobs = recent_result.scalar() or 0

    # Average rating
    avg_result = await db.execute(
        select(func.avg(JobHistory.rating))
        .where(JobHistory.worker_id == worker.id)
        .where(JobHistory.rating.is_not(None))
    )
    avg_rating = avg_result.scalar()

    return ProfileResponse(
        worker_id=worker.id,
        name=worker.name,
        email=worker.email,
        phone=worker.phone,
        skills=worker.skills,
        reliability_score=worker.reliability_score,
        latitude=worker.latitude,
        longitude=worker.longitude,
        address=worker.address,
        is_available=worker.is_available,
        total_jobs=total_jobs,
        recent_jobs_7d=recent_jobs,
        average_rating=round(avg_rating, 1) if avg_rating else None,
    )
