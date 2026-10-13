"""Live public web/API evidence retrieval via gl.nondet.web.get against
real, reachable public URLs (not a direct-mode mock), per brief section 11
("live public web/API retrieval where network permits").

Design: submit evidence pointing at a real, stable public URL (e.g. a
well-known static JSON endpoint) and confirm the evaluation module's
leader fetch records a real 2xx status and real content length, letting
the deterministic contradiction-downgrade logic in
contracts/agentverdict.py operate on genuinely live data end to end.

BLOCKED in this session: same stacked GLSim-deployment and LLM-provider-key
blockers as tests/integration/test_consensus_equivalence.py. Even the
web-fetch-only half of this test still runs inside request_evaluation's
leader/validator closures alongside the LLM call in this contract's design
(docs/EQUIVALENCE_MATRIX.md), so it cannot be exercised independently of
the LLM blocker without changing the contract's structure.
"""

import pytest

pytestmark = pytest.mark.skip(
    reason=(
        "BLOCKED: same GLSim deployment blocker and LLM-provider-key blocker as "
        "tests/integration/test_consensus_equivalence.py; see that file's module "
        "docstring and docs/FINAL_HANDOFF.md."
    )
)


def test_live_public_url_evidence_fetch_records_real_status_and_length():
    pass
