"""NELB Allocation Engine — Brain 1.

5-step multi-constraint reasoning pipeline for fair job distribution.
Pure Python logic — no LLM calls.

Steps:
1. Skills and qualification filter
2. Reliability filter (>50%)
3. Availability filter
4. Distance analysis (Haversine + radius cutoff)
5. Fairness analysis (7-day job count penalty)

Returns top 5 candidates with composite scores and full reasoning trace.
"""

import math
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.worker import Worker
from app.models.job_history import JobHistory
from app.schemas.agent import (
    AllocationRequest,
    AllocationResponse,
    WorkerScore,
    ReasoningStep,
)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two GPS points in kilometres."""
    R = 6371.0  # Earth's radius in km
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def allocate_job(request: AllocationRequest, db: AsyncSession) -> AllocationResponse:
    """Run the full 5-step allocation pipeline."""

    reasoning_steps: list[ReasoningStep] = []
    radius = request.radius_km or settings.default_radius_km

    # Fetch all workers
    result = await db.execute(select(Worker))
    all_workers = list(result.scalars().all())
    total_evaluated = len(all_workers)

    # --- Step 1: Skills filter ---
    job_category = request.job_category.lower().strip()
    skilled_workers = []
    step1_eliminated = []

    for w in all_workers:
        worker_skills = [s.lower().strip() for s in w.skills]
        if job_category in worker_skills:
            skilled_workers.append((w, 1.0))
        elif "general repair" in worker_skills or "general repairs" in worker_skills:
            skilled_workers.append((w, 0.7))
        else:
            step1_eliminated.append(w.name)

    reasoning_steps.append(ReasoningStep(
        step=1,
        name="Skills filter",
        description=f"Filtering workers with '{job_category}' skill or general repair fallback.",
        candidates_before=total_evaluated,
        candidates_after=len(skilled_workers),
        eliminated=step1_eliminated,
    ))

    # --- Step 2: Reliability filter ---
    reliable_workers = []
    step2_eliminated = []

    for w, skill_score in skilled_workers:
        if w.reliability_score >= 50.0:
            reliable_workers.append((w, skill_score))
        else:
            step2_eliminated.append(f"{w.name} (reliability: {w.reliability_score}%)")

    reasoning_steps.append(ReasoningStep(
        step=2,
        name="Reliability filter",
        description="Removing workers with reliability score below 50%.",
        candidates_before=len(skilled_workers),
        candidates_after=len(reliable_workers),
        eliminated=step2_eliminated,
    ))

    # --- Step 3: Availability filter ---
    available_workers = []
    step3_eliminated = []

    for w, skill_score in reliable_workers:
        if w.is_available:
            available_workers.append((w, skill_score))
        else:
            step3_eliminated.append(f"{w.name} (unavailable)")

    reasoning_steps.append(ReasoningStep(
        step=3,
        name="Availability filter",
        description="Excluding workers marked as unavailable.",
        candidates_before=len(reliable_workers),
        candidates_after=len(available_workers),
        eliminated=step3_eliminated,
    ))

    # --- Step 4: Distance analysis ---
    distance_workers = []
    step4_eliminated = []

    for w, skill_score in available_workers:
        dist = haversine_distance(request.location.latitude, request.location.longitude, w.latitude, w.longitude)
        if dist <= radius:
            # Linear decay: closer = higher score, 0 at radius boundary
            distance_score = max(0.0, 1.0 - (dist / radius))
            distance_workers.append((w, skill_score, distance_score, dist))
        else:
            step4_eliminated.append(f"{w.name} ({dist:.1f}km — outside {radius}km radius)")

    reasoning_steps.append(ReasoningStep(
        step=4,
        name="Distance analysis",
        description=f"Scoring by proximity using Haversine formula. Radius: {radius}km.",
        candidates_before=len(available_workers),
        candidates_after=len(distance_workers),
        eliminated=step4_eliminated,
    ))

    # --- Step 5: Fairness analysis ---
    fairness_window = datetime.now(timezone.utc) - timedelta(days=settings.fairness_window_days)
    scored_workers: list[WorkerScore] = []
    step5_notes = []

    for w, skill_score, distance_score, dist_km in distance_workers:
        # Count jobs completed by this worker in the fairness window
        job_count_result = await db.execute(
            select(func.count(JobHistory.id))
            .where(JobHistory.worker_id == w.id)
            .where(JobHistory.completed_at >= fairness_window)
        )
        recent_jobs = job_count_result.scalar() or 0

        # Fairness score: penalise if above threshold
        if recent_jobs >= settings.fairness_threshold_jobs:
            overage = recent_jobs - settings.fairness_threshold_jobs
            fairness_score = max(0.0, 1.0 - (overage * 0.25))
            step5_notes.append(f"{w.name}: {recent_jobs} jobs in {settings.fairness_window_days}d — penalty applied")
        else:
            fairness_score = 1.0

        # Normalise reliability to 0-1
        reliability_norm = w.reliability_score / 100.0

        # Composite score
        composite = (
            skill_score * 0.30
            + reliability_norm * 0.25
            + distance_score * 0.25
            + fairness_score * 0.20
        )

        scored_workers.append(WorkerScore(
            worker_id=w.id,
            worker_name=w.name,
            skill_score=round(skill_score * 100, 1),
            reliability_score=round(reliability_norm * 100, 1),
            distance_score=round(distance_score * 100, 1),
            fairness_score=round(fairness_score * 100, 1),
            composite_score=round(composite * 100, 1),
            distance_km=round(dist_km, 2),
            skills=w.skills,
            recent_jobs_7d=recent_jobs,
        ))

    reasoning_steps.append(ReasoningStep(
        step=5,
        name="Fairness analysis",
        description=f"Checking job count in last {settings.fairness_window_days} days. Threshold: {settings.fairness_threshold_jobs} jobs.",
        candidates_before=len(distance_workers),
        candidates_after=len(scored_workers),
        eliminated=step5_notes if step5_notes else ["No fairness penalties applied"],
    ))

    # Sort by composite score, take top N
    scored_workers.sort(key=lambda w: w.composite_score, reverse=True)
    top_recommendations = scored_workers[:settings.max_recommendations]

    # Generate explanation
    if top_recommendations:
        best = top_recommendations[0]
        explanation = (
            f"Recommended: {best.worker_name} with a composite score of {best.composite_score}%. "
            f"Skill match: {best.skill_score}%, Reliability: {best.reliability_score}%, "
            f"Distance: {best.distance_score}% ({best.distance_km}km away), "
            f"Fairness: {best.fairness_score}% ({best.recent_jobs_7d} jobs in last {settings.fairness_window_days} days). "
            f"Evaluated {total_evaluated} workers total, {len(top_recommendations)} recommended."
        )
        confidence = best.composite_score / 100.0
    else:
        explanation = f"No eligible workers found within {radius}km for category '{job_category}'. Evaluated {total_evaluated} workers."
        confidence = 0.0

    return AllocationResponse(
        recommendations=top_recommendations,
        reasoning_trace=reasoning_steps,
        explanation=explanation,
        confidence=round(confidence, 2),
        total_candidates_evaluated=total_evaluated,
    )
