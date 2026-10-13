"""Accurate finality semantics under real consensus: a PROVISIONAL verdict
must be distinguishable, via the real transaction/receipt lifecycle (not
just application-level storage state), from a FINALIZED one -- the
"chain reorg / finality ambiguity" threat in docs/SECURITY_THREAT_MODEL.md.

Design: after request_evaluation, inspect the receipt's own status/finality
fields (ACCEPTED vs FINALIZED, per the genlayer-dev integration-tests skill's
own warning that "ACCEPTED and FINALIZED are transaction lifecycle states,
not proof that contract execution succeeded") alongside this contract's own
Verdict.state field, and confirm the two layers of finality (GenLayer
consensus finality vs this application's challenge-window finality) are
reported separately and never conflated, exactly as spec section 4.2
requires.

BLOCKED in this session: same stacked GLSim-deployment and LLM-provider-key
blockers as tests/integration/test_consensus_equivalence.py.
"""

import pytest

pytestmark = pytest.mark.skip(
    reason=(
        "BLOCKED: same GLSim deployment blocker and LLM-provider-key blocker as "
        "tests/integration/test_consensus_equivalence.py; see that file's module "
        "docstring and docs/FINAL_HANDOFF.md."
    )
)


def test_provisional_verdict_distinct_from_chain_finality():
    pass


def test_finalized_verdict_matches_closed_challenge_window():
    pass
