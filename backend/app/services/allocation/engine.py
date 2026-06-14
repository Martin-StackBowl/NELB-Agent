"""NELB Allocation Engine — Brain 1.

6-step multi-constraint reasoning pipeline for fair job distribution.
Pure Python logic — no LLM calls.

Steps:
1. Skills and qualification filter
   - Exact match scores 1.0.
   - General-repair fallback scores 0.7 EXCEPT for electrical and plumbing
     (safety-critical categories that must not be served by unqualified workers).
2. Reliability filter (>= 50% base score required)
3. Availability filter
4. Distance analysis (Haversine + linear decay within radius)
5. Budget fit (worker's expected price vs employer's budget)
6. Fairness analysis (7-day job count — 3+ jobs triggers escalating penalty)

Reliability composite = 70% base reliability_score + 30% average star rating
(blends the worker's earned reputation into the ranking).

Confidence = margin between winner and runner-up relative to pool size
(honest signal — a dominant winner in a large pool scores higher than
a marginal winner in a pool of two).

Returns top 5 candidates with composite scores and full reasoning trace.
"""

import math
from datetime import datetime, timedelta, timezone

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
    R = 6371.0
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# Categories where a "general repair" fallback is NOT permitted.
# Electrical and plumbing require specific qualifications for safety reasons.
SAFETY_CRITICAL_CATEGORIES = {"electrical", "plumbing"}

# Typical market price (ZAR, total per job) for each category. Used as the
# baseline when a worker has no completed jobs in that category yet, scaled
# by the worker's price_factor positioning.
CATEGORY_BASE_RATES: dict[str, float] = {
    "cleaning": 400.0,
    "gardening": 450.0,
    "painting": 1200.0,
    "plumbing": 600.0,
    "electrical": 800.0,
    "tiling": 2500.0,
    "carpentry": 1500.0,
    "moving": 900.0,
    "general repair": 600.0,
}
DEFAULT_BASE_RATE = 600.0

# A worker is eliminated when their expected price exceeds the budget by more
# than this fraction. Within the band, score decays linearly to 0.
BUDGET_OVER_TOLERANCE = 0.30

# Weights for reliability composite: base score vs average star rating.
RELIABILITY_BASE_WEIGHT = 0.70
RELIABILITY_RATING_WEIGHT = 0.30
MAX_STAR_RATING = 5.0


async def allocate_job(request: AllocationRequest, db: AsyncSession) -> AllocationResponse:
    """Run the full 6-step allocation pipeline."""

    reasoning_steps: list[ReasoningStep] = []
    radius = request.radius_km or settings.default_radius_km

    # Fetch all workers
    result = await db.execute(select(Worker))
    all_workers = list(result.scalars().all())
    total_evaluated = len(all_workers)

    # --- Step 0: Self-exclusion ---
    if request.exclude_worker_id:
        original_count = len(all_workers)
        excluded_name = None
        filtered_workers = []
        for w in all_workers:
            if w.id == request.exclude_worker_id:
                excluded_name = w.name
            else:
                filtered_workers.append(w)
        all_workers = filtered_workers
        if excluded_name:
            reasoning_steps.append(ReasoningStep(
                step=0,
                name="Self-exclusion",
                description="Removed posting user from candidate pool (workers cannot hire themselves).",
                candidates_before=original_count,
                candidates_after=len(all_workers),
                eliminated=[excluded_name],
            ))
            total_evaluated = len(all_workers)

    # --- Step 1: Skills filter ---
    job_category = request.job_category.lower().strip()
    is_safety_critical = job_category in SAFETY_CRITICAL_CATEGORIES
    skilled_workers = []
    step1_eliminated = []

    for w in all_workers:
        worker_skills = [s.lower().strip() for s in w.skills]
        if job_category in worker_skills:
            skilled_workers.append((w, 1.0))
        elif (
            not is_safety_critical
            and ("general repair" in worker_skills or "general repairs" in worker_skills)
        ):
            # General repair is a valid fallback for non-safety-critical categories.
            skilled_workers.append((w, 0.7))
        else:
            reason = (
                f"{w.name} (general repair fallback not permitted for {job_category} — safety-critical)"
                if is_safety_critical
                and ("general repair" in worker_skills or "general repairs" in worker_skills)
                else w.name
            )
            step1_eliminated.append(reason)

    reasoning_steps.append(ReasoningStep(
        step=1,
        name="Skills filter",
        description=(
            f"Filtering workers with '{job_category}' skill. "
            f"General-repair fallback is {'disabled (safety-critical category)' if is_safety_critical else 'allowed'}."
        ),
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
        description="Removing workers with base reliability score below 50%.",
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
        dist = haversine_distance(
            request.location.latitude, request.location.longitude,
            w.latitude, w.longitude,
        )
        if dist <= radius:
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

    # --- Step 5: Budget fit ---
    budget = request.budget or 0.0
    has_budget = budget > 0
    budget_workers = []
    step5_eliminated = []

    price_map: dict = {}
    if distance_workers:
        ids = [w.id for (w, *_rest) in distance_workers]
        price_result = await db.execute(
            select(JobHistory.worker_id, func.avg(JobHistory.payment_amount))
            .where(JobHistory.worker_id.in_(ids))
            .where(func.lower(JobHistory.category) == job_category)
            .group_by(JobHistory.worker_id)
        )
        price_map = {row[0]: float(row[1]) for row in price_result.all() if row[1]}

    base_rate = CATEGORY_BASE_RATES.get(job_category, DEFAULT_BASE_RATE)

    for w, skill_score, distance_score, dist_km in distance_workers:
        estimate = price_map.get(w.id, base_rate * getattr(w, "price_factor", 1.0))

        if not has_budget:
            budget_workers.append((w, skill_score, distance_score, dist_km, 1.0, estimate))
            continue

        ratio = estimate / budget
        if ratio <= 1.0:
            budget_workers.append((w, skill_score, distance_score, dist_km, 1.0, estimate))
        elif ratio <= 1.0 + BUDGET_OVER_TOLERANCE:
            budget_score = max(0.0, 1.0 - (ratio - 1.0) / BUDGET_OVER_TOLERANCE)
            budget_workers.append((w, skill_score, distance_score, dist_km, budget_score, estimate))
        else:
            over_pct = (ratio - 1.0) * 100
            step5_eliminated.append(
                f"{w.name} (est. R{estimate:.0f} — {over_pct:.0f}% over R{budget:.0f} budget)"
            )

    reasoning_steps.append(ReasoningStep(
        step=5,
        name="Budget fit",
        description=(
            f"Comparing each worker's expected price for '{job_category}' to the R{budget:.0f} budget. "
            f"Workers priced more than {int(BUDGET_OVER_TOLERANCE * 100)}% above budget are eliminated."
            if has_budget
            else "No budget specified — all candidates pass this step."
        ),
        candidates_before=len(distance_workers),
        candidates_after=len(budget_workers),
        eliminated=step5_eliminated or (["All within budget"] if has_budget else ["No budget filter applied"]),
    ))

    # --- Step 6: Fairness + rating-blended reliability + composite scoring ---
    #
    # Reliability composite: blends the static reliability_score (track record,
    # cancellations) with the worker's average star rating from completed jobs.
    # This means a 5-star worker with the same base score outranks a 3-star one.
    #
    # Fairness: threshold is inclusive — reaching the threshold triggers a
    # penalty. overage = recent_jobs - threshold + 1 ensures 3 jobs gives a
    # light penalty (0.75), 4 gives more (0.50), up to a floor of 0.
    #
    # Composite weights: 25 / 20 / 20 / 20 / 15 (skill/reliability/distance/fairness/budget)
    fairness_window = datetime.now(timezone.utc) - timedelta(days=settings.fairness_window_days)
    scored_workers: list[WorkerScore] = []
    step6_notes = []

    # Fetch average ratings for all surviving workers in one query.
    if budget_workers:
        surviving_ids = [w.id for (w, *_rest) in budget_workers]
        rating_result = await db.execute(
            select(JobHistory.worker_id, func.avg(JobHistory.rating))
            .where(JobHistory.worker_id.in_(surviving_ids))
            .where(JobHistory.rating.is_not(None))
            .group_by(JobHistory.worker_id)
        )
        rating_map = {row[0]: float(row[1]) for row in rating_result.all() if row[1]}
    else:
        rating_map = {}

    for w, skill_score, distance_score, dist_km, budget_score, estimated_price in budget_workers:
        # Recent job count for fairness
        job_count_result = await db.execute(
            select(func.count(JobHistory.id))
            .where(JobHistory.worker_id == w.id)
            .where(JobHistory.completed_at >= fairness_window)
        )
        recent_jobs = job_count_result.scalar() or 0

        # Fairness: threshold is inclusive (3 jobs triggers a penalty)
        if recent_jobs >= settings.fairness_threshold_jobs:
            overage = recent_jobs - settings.fairness_threshold_jobs + 1
            fairness_score = max(0.0, 1.0 - (overage * 0.25))
            step6_notes.append(
                f"{w.name}: {recent_jobs} jobs in {settings.fairness_window_days}d — penalty applied"
            )
        else:
            fairness_score = 1.0

        # Reliability composite: base score blended with average star rating
        base_reliability = w.reliability_score / 100.0
        avg_rating = rating_map.get(w.id)
        if avg_rating is not None:
            rating_norm = avg_rating / MAX_STAR_RATING
            reliability_composite = (
                RELIABILITY_BASE_WEIGHT * base_reliability
                + RELIABILITY_RATING_WEIGHT * rating_norm
            )
        else:
            # No ratings yet — use base score only (no penalty for newcomers)
            reliability_composite = base_reliability

        # Composite score
        composite = (
            skill_score * 0.25
            + reliability_composite * 0.20
            + distance_score * 0.20
            + fairness_score * 0.20
            + budget_score * 0.15
        )

        scored_workers.append(WorkerScore(
            worker_id=w.id,
            worker_name=w.name,
            skill_score=round(skill_score * 100, 1),
            reliability_score=round(reliability_composite * 100, 1),
            distance_score=round(distance_score * 100, 1),
            fairness_score=round(fairness_score * 100, 1),
            budget_score=round(budget_score * 100, 1),
            estimated_price=round(estimated_price, 2),
            composite_score=round(composite * 100, 1),
            distance_km=round(dist_km, 2),
            skills=w.skills,
            recent_jobs_7d=recent_jobs,
        ))

    reasoning_steps.append(ReasoningStep(
        step=6,
        name="Fairness analysis",
        description=(
            f"Checking job count in last {settings.fairness_window_days} days. "
            f"Threshold: {settings.fairness_threshold_jobs} jobs triggers a penalty. "
            f"Reliability score blends base score (70%) with average star rating (30%)."
        ),
        candidates_before=len(budget_workers),
        candidates_after=len(scored_workers),
        eliminated=step6_notes if step6_notes else ["No fairness penalties applied"],
    ))

    # Sort by composite score, take top N
    scored_workers.sort(key=lambda w: w.composite_score, reverse=True)
    top_recommendations = scored_workers[:settings.max_recommendations]

    # --- Confidence: margin-based, weighted by pool size ---
    # confidence = (winner_score - runner_up_score) / winner_score * pool_factor
    # A dominant winner in a large pool scores higher than a marginal winner in a
    # pool of two. Clamped to [0, 1].
    if top_recommendations:
        best = top_recommendations[0]
        winner_score = best.composite_score / 100.0
        if len(top_recommendations) >= 2:
            runner_up_score = top_recommendations[1].composite_score / 100.0
            margin = (winner_score - runner_up_score) / max(winner_score, 0.001)
        else:
            margin = 1.0
        pool_size = len(scored_workers)
        pool_factor = min(1.0, pool_size / 5.0)
        confidence = round(min(1.0, margin * pool_factor + winner_score * 0.4), 2)

        explanation = (
            f"Recommended: **{best.worker_name}** with a composite score of {best.composite_score}%. "
            f"Skill match: {best.skill_score}%, "
            f"Reliability (incl. ratings): {best.reliability_score}%, "
            f"Distance: {best.distance_score}% ({best.distance_km}km away), "
            f"Budget fit: {best.budget_score}% (est. R{best.estimated_price:.0f}"
            f"{f' vs R{request.budget:.0f} budget' if request.budget else ''}), "
            f"Fairness: {best.fairness_score}% ({best.recent_jobs_7d} jobs in last {settings.fairness_window_days} days). "
            f"Evaluated {total_evaluated} workers total, {len(top_recommendations)} recommended."
        )
    else:
        confidence = 0.0
        # Diagnose the actual eliminator from the reasoning trace
        eliminator = None
        for step in reasoning_steps:
            if step.candidates_after == 0 and step.candidates_before > 0:
                eliminator = step.name
                break

        if eliminator == "Budget fit":
            explanation = (
                f"No {job_category} workers matched your budget. "
                f"You may want to adjust your budget or widen the search radius to see more options."
            )
        elif eliminator == "Distance analysis":
            explanation = (
                f"No {job_category} workers were found within {radius}km. "
                f"Workers may be further out — try widening the radius, or move your pin closer to a serviced area."
            )
        elif eliminator == "Skills filter":
            explanation = (
                f"No workers with {job_category} skills are available right now."
            )
        elif eliminator == "Reliability filter":
            explanation = (
                f"Workers with {job_category} skills are in the area, but none have a strong enough track record yet."
            )
        elif eliminator == "Availability filter":
            explanation = (
                f"Workers with {job_category} skills are nearby, but all are currently unavailable. Check back later."
            )
        else:
            explanation = f"No {job_category} workers were found for your current search."

    # Enrich with Foundry IQ if applicable
    from app.services.allocation.enrichment import enrich_with_foundry_iq
    enriched_explanation, citations = await enrich_with_foundry_iq(top_recommendations, explanation)

    return AllocationResponse(
        recommendations=top_recommendations,
        reasoning_trace=reasoning_steps,
        explanation=enriched_explanation,
        confidence=confidence,
        total_candidates_evaluated=total_evaluated,
        citations=citations,
    )
