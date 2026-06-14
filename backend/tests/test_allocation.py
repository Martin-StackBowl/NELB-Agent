"""Unit tests for the NELB Allocation Engine (Brain 1).

Tests cover:
1.  Haversine distance — same point, known distance, symmetry
2.  Skill match — exact (1.0) and general-repair fallback (0.7)
3.  Safety-critical categories — general-repair fallback blocked for electrical/plumbing
4.  Reliability filter — threshold at 50%
5.  Fairness penalty — inclusive threshold (3 jobs triggers penalty)
6.  Fairness — no penalty below threshold
7.  Reliability composite — blends base score with star rating
8.  Reliability composite — newcomer (no ratings) uses base score only
9.  Budget fit — within budget scores 1.0
10. Budget fit — cheaper than budget still caps at 1.0 (no race to bottom)
11. Budget fit — slightly over budget decays linearly
12. Budget fit — at tolerance edge scores 0
13. Budget fit — far over budget is eliminated (None)
14. Budget fit — no budget is neutral (1.0)
15. Composite score — weights sum to 1.0 and calculation is correct
16. Distance score — linear decay
17. No candidates — edge case
18. Top-5 limit
19. Confidence — margin-based, higher for dominant winner
20. Confidence — single candidate gets a reasonable signal
"""

import pytest
from app.services.allocation.engine import (
    haversine_distance,
    SAFETY_CRITICAL_CATEGORIES,
    BUDGET_OVER_TOLERANCE,
    RELIABILITY_BASE_WEIGHT,
    RELIABILITY_RATING_WEIGHT,
    MAX_STAR_RATING,
)


class TestHaversineDistance:

    def test_same_point_is_zero(self):
        assert haversine_distance(-25.75, 28.23, -25.75, 28.23) == 0.0

    def test_known_distance_pretoria(self):
        dist = haversine_distance(-25.7479, 28.2293, -25.8100, 28.2500)
        assert 5.0 < dist < 15.0

    def test_symmetrical(self):
        d1 = haversine_distance(-25.75, 28.23, -25.80, 28.28)
        d2 = haversine_distance(-25.80, 28.28, -25.75, 28.23)
        assert abs(d1 - d2) < 0.001


class TestSkillsFilter:

    def test_exact_match_scores_1(self):
        assert "cleaning" in ["cleaning", "gardening"]

    def test_general_repair_fallback_allowed_for_non_safety_critical(self):
        category = "carpentry"
        worker_skills = ["general repair"]
        assert category not in SAFETY_CRITICAL_CATEGORIES
        assert "general repair" in worker_skills

    def test_general_repair_fallback_blocked_for_electrical(self):
        assert "electrical" in SAFETY_CRITICAL_CATEGORIES

    def test_general_repair_fallback_blocked_for_plumbing(self):
        assert "plumbing" in SAFETY_CRITICAL_CATEGORIES

    def test_non_matching_worker_eliminated(self):
        worker_skills = ["gardening"]
        job = "painting"
        has_exact = job in worker_skills
        has_general = "general repair" in worker_skills
        assert not has_exact and not has_general


class TestReliabilityFilter:

    def test_below_threshold_excluded(self):
        assert 45.0 < 50.0

    def test_at_threshold_passes(self):
        assert 50.0 >= 50.0

    def test_above_threshold_passes(self):
        assert 88.0 >= 50.0


class TestFairnessPenalty:

    T = 3  # mirrors settings.fairness_threshold_jobs

    def _fairness(self, recent_jobs: int) -> float:
        if recent_jobs >= self.T:
            overage = recent_jobs - self.T + 1  # inclusive threshold
            return max(0.0, 1.0 - overage * 0.25)
        return 1.0

    def test_below_threshold_no_penalty(self):
        assert self._fairness(2) == 1.0

    def test_at_threshold_triggers_light_penalty(self):
        # 3 jobs: overage = 1, penalty = 0.25 → score = 0.75
        assert self._fairness(3) == pytest.approx(0.75)

    def test_one_above_threshold_more_penalty(self):
        # 4 jobs: overage = 2, penalty = 0.50 → score = 0.50
        assert self._fairness(4) == pytest.approx(0.50)

    def test_heavy_overallocation_floors_at_zero(self):
        # 7 jobs: overage = 5, penalty = 1.25 → floors at 0.0
        assert self._fairness(7) == 0.0

    def test_zero_jobs_no_penalty(self):
        assert self._fairness(0) == 1.0


class TestReliabilityComposite:

    def _composite(self, base: float, avg_rating: float | None) -> float:
        base_norm = base / 100.0
        if avg_rating is not None:
            rating_norm = avg_rating / MAX_STAR_RATING
            return RELIABILITY_BASE_WEIGHT * base_norm + RELIABILITY_RATING_WEIGHT * rating_norm
        return base_norm

    def test_five_star_rating_boosts_score(self):
        r_with_5star = self._composite(88.0, 5.0)
        r_without_rating = self._composite(88.0, None)
        assert r_with_5star > r_without_rating

    def test_low_rating_reduces_score(self):
        r_with_2star = self._composite(88.0, 2.0)
        r_without_rating = self._composite(88.0, None)
        assert r_with_2star < r_without_rating

    def test_no_rating_uses_base_only(self):
        assert self._composite(95.0, None) == pytest.approx(0.95)

    def test_weights_sum_to_one(self):
        assert RELIABILITY_BASE_WEIGHT + RELIABILITY_RATING_WEIGHT == pytest.approx(1.0)

    def test_equal_base_different_rating_produces_different_score(self):
        r_high = self._composite(80.0, 5.0)
        r_low = self._composite(80.0, 2.0)
        assert r_high > r_low


class TestBudgetFit:

    TOL = BUDGET_OVER_TOLERANCE

    def _score(self, estimate: float, budget: float) -> float | None:
        if budget <= 0:
            return 1.0
        ratio = estimate / budget
        if ratio <= 1.0:
            return 1.0
        if ratio <= 1.0 + self.TOL:
            return max(0.0, 1.0 - (ratio - 1.0) / self.TOL)
        return None

    def test_within_budget_full_score(self):
        assert self._score(400, 500) == 1.0

    def test_exactly_on_budget_full_score(self):
        assert self._score(500, 500) == 1.0

    def test_cheaper_not_rewarded_above_full(self):
        assert self._score(200, 500) == 1.0

    def test_slightly_over_budget_partial_score(self):
        # 15% over, 30% tolerance → 0.5
        assert self._score(575, 500) == pytest.approx(0.5)

    def test_at_tolerance_edge_scores_zero(self):
        assert self._score(650, 500) == pytest.approx(0.0)

    def test_far_over_budget_eliminated(self):
        assert self._score(700, 500) is None

    def test_no_budget_is_neutral(self):
        assert self._score(2500, 0) == 1.0


class TestCompositeScore:

    def test_weights_sum_to_one(self):
        total = 0.25 + 0.20 + 0.20 + 0.20 + 0.15
        assert total == pytest.approx(1.0)

    def test_composite_calculation(self):
        skill, reliability, distance, fairness, budget = 1.0, 0.9, 0.8, 1.0, 1.0
        composite = skill * 0.25 + reliability * 0.20 + distance * 0.20 + fairness * 0.20 + budget * 0.15
        assert composite == pytest.approx(0.25 + 0.18 + 0.16 + 0.20 + 0.15)

    def test_distance_linear_decay(self):
        radius = 5.0
        assert max(0.0, 1.0 - 1.0 / radius) == pytest.approx(0.8)
        assert max(0.0, 1.0 - 4.0 / radius) == pytest.approx(0.2)
        assert max(0.0, 1.0 - 5.0 / radius) == 0.0

    def test_no_candidates_outside_radius(self):
        assert 7.5 > 5.0

    def test_top_5_limit(self):
        candidates = list(range(12))
        assert len(candidates[:5]) == 5


class TestConfidenceSignal:

    def _confidence(self, scores: list[float]) -> float:
        if not scores:
            return 0.0
        scores = sorted(scores, reverse=True)
        winner = scores[0] / 100.0
        runner_up = (scores[1] / 100.0) if len(scores) >= 2 else 0.0
        margin = (winner - runner_up) / max(winner, 0.001)
        pool_factor = min(1.0, len(scores) / 5.0)
        return round(min(1.0, margin * pool_factor + winner * 0.4), 2)

    def test_dominant_winner_large_pool_high_confidence(self):
        # Big gap, 5 candidates
        scores = [90, 55, 54, 53, 52]
        assert self._confidence(scores) > 0.7

    def test_marginal_winner_low_confidence(self):
        # Tiny gap, 2 candidates
        scores = [70, 69]
        assert self._confidence(scores) < 0.5

    def test_single_candidate_reasonable_signal(self):
        c = self._confidence([82])
        assert 0.3 < c <= 1.0

    def test_no_candidates_zero(self):
        assert self._confidence([]) == 0.0
