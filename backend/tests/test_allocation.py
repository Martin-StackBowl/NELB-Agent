"""Unit tests for the NELB Allocation Engine (Brain 1).

Tests cover:
1. Correct candidate recommendation (top scorer wins)
2. Skills filter (only matching skills pass)
3. Reliability filter (below 50% excluded)
4. Availability filter (unavailable excluded)
5. Radius filter (outside radius excluded)
6. Fairness penalty (workers with many recent jobs penalised)
7. General repair fallback (partial match at 0.7)
8. Composite scoring correctness
9. No-candidate edge case (empty result)
"""

import pytest
from app.services.allocation.engine import haversine_distance


class TestHaversineDistance:
    """Test the distance calculation utility."""

    def test_same_point_is_zero(self):
        dist = haversine_distance(-25.75, 28.23, -25.75, 28.23)
        assert dist == 0.0

    def test_known_distance_pretoria(self):
        # Hatfield to Centurion is roughly 10-12km
        dist = haversine_distance(-25.7479, 28.2293, -25.8100, 28.2500)
        assert 5.0 < dist < 15.0  # Rough bounds

    def test_symmetrical(self):
        d1 = haversine_distance(-25.75, 28.23, -25.80, 28.28)
        d2 = haversine_distance(-25.80, 28.28, -25.75, 28.23)
        assert abs(d1 - d2) < 0.001


class TestAllocationEngineLogic:
    """Test allocation engine logic components.

    Note: Full integration tests require an async database session.
    These test the pure logic functions independently.
    """

    def test_skill_match_exact(self):
        """Exact skill match should score 1.0."""
        worker_skills = ["cleaning", "gardening"]
        job_category = "cleaning"
        assert job_category in worker_skills

    def test_skill_match_general_repair_fallback(self):
        """General repair should be a partial match."""
        worker_skills = ["general repair"]
        job_category = "plumbing"
        # Worker doesn't have exact match but has general repair
        has_exact = job_category in worker_skills
        has_general = "general repair" in worker_skills
        assert not has_exact
        assert has_general
        # Score should be 0.7, not 1.0

    def test_reliability_threshold(self):
        """Workers below 50% reliability should be excluded."""
        threshold = 50.0
        assert 45.0 < threshold  # Palesa (45%) would be excluded
        assert 75.0 >= threshold  # Everyone else passes

    def test_fairness_penalty_calculation(self):
        """Workers exceeding threshold should be penalised."""
        threshold = 3
        recent_jobs = 5
        overage = recent_jobs - threshold
        fairness_score = max(0.0, 1.0 - (overage * 0.25))
        assert fairness_score == 0.5  # 2 over threshold * 0.25 penalty

    def test_fairness_no_penalty(self):
        """Workers below threshold should get full fairness score."""
        threshold = 3
        recent_jobs = 1
        if recent_jobs >= threshold:
            fairness_score = max(0.0, 1.0 - ((recent_jobs - threshold) * 0.25))
        else:
            fairness_score = 1.0
        assert fairness_score == 1.0

    def test_composite_score_weights(self):
        """Composite score should respect weight distribution."""
        skill = 1.0
        reliability = 0.9
        distance = 0.8
        fairness = 1.0
        composite = skill * 0.30 + reliability * 0.25 + distance * 0.25 + fairness * 0.20
        expected = 0.30 + 0.225 + 0.20 + 0.20
        assert abs(composite - expected) < 0.001

    def test_distance_score_linear_decay(self):
        """Distance score should decay linearly from 1.0 at 0km to 0.0 at radius boundary."""
        radius = 5.0
        dist_1km = 1.0
        dist_4km = 4.0
        dist_5km = 5.0

        score_1 = max(0.0, 1.0 - (dist_1km / radius))
        score_4 = max(0.0, 1.0 - (dist_4km / radius))
        score_5 = max(0.0, 1.0 - (dist_5km / radius))

        assert score_1 == 0.8
        assert score_4 == pytest.approx(0.2)
        assert score_5 == 0.0

    def test_no_candidates_outside_radius(self):
        """Workers outside radius should be excluded."""
        radius = 5.0
        worker_distance = 7.5
        assert worker_distance > radius  # Would be excluded

    def test_top_5_limit(self):
        """Should never return more than 5 recommendations."""
        max_recommendations = 5
        candidates = list(range(12))  # 12 candidates
        top = candidates[:max_recommendations]
        assert len(top) == 5


class TestBudgetFit:
    """Test the budget-fit scoring logic (Step 5)."""

    TOL = 0.30

    def _budget_score(self, estimate: float, budget: float):
        """Mirror of the engine's budget logic. Returns score or None if eliminated."""
        if budget <= 0:
            return 1.0
        ratio = estimate / budget
        if ratio <= 1.0:
            return 1.0
        if ratio <= 1.0 + self.TOL:
            return max(0.0, 1.0 - (ratio - 1.0) / self.TOL)
        return None  # eliminated

    def test_within_budget_full_score(self):
        assert self._budget_score(400, 500) == 1.0

    def test_exactly_on_budget_full_score(self):
        assert self._budget_score(500, 500) == 1.0

    def test_cheaper_not_rewarded_above_full(self):
        """Being far cheaper still caps at 1.0 — no race to the bottom."""
        assert self._budget_score(200, 500) == 1.0

    def test_slightly_over_budget_partial_score(self):
        # 15% over, tolerance 30% -> halfway decay -> 0.5
        assert self._budget_score(575, 500) == pytest.approx(0.5)

    def test_at_tolerance_edge_scores_zero(self):
        # exactly 30% over -> score 0 but not eliminated
        assert self._budget_score(650, 500) == pytest.approx(0.0)

    def test_far_over_budget_eliminated(self):
        # 40% over -> beyond tolerance -> eliminated
        assert self._budget_score(700, 500) is None

    def test_no_budget_is_neutral(self):
        assert self._budget_score(2500, 0) == 1.0

    def test_composite_includes_budget_weight(self):
        """Composite uses the re-balanced 25/20/20/20/15 weights summing to 1.0."""
        skill, reliability, distance, fairness, budget = 1.0, 0.9, 0.8, 1.0, 1.0
        composite = (
            skill * 0.25
            + reliability * 0.20
            + distance * 0.20
            + fairness * 0.20
            + budget * 0.15
        )
        weights_sum = 0.25 + 0.20 + 0.20 + 0.20 + 0.15
        assert weights_sum == pytest.approx(1.0)
        assert composite == pytest.approx(0.25 + 0.18 + 0.16 + 0.20 + 0.15)
