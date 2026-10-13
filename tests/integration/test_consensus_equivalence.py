"""Validator equivalence on semantically similar but textually different
explanations, under REAL multi-node consensus (not direct-mode's single
leader-only execution plus a manual run_validator() replay).

Design: deploy, create an active agreement, submit evidence, call
request_evaluation, then inspect the transaction receipt's
``consensus_data.validators`` entries to confirm multiple independently
executing validator nodes reached the same structured decision (per
docs/EQUIVALENCE_MATRIX.md) despite the leader and each validator
independently re-fetching evidence and re-prompting the LLM -- the real
end-to-end proof that direct-mode's single-process simulation cannot
provide (docs/GENLAYER_CAPABILITY_MATRIX.md section 4).

BLOCKED in this session for two independent, stacked reasons, each
confirmed by an actual attempt (not assumed):
1. The only GenVM-shaped local network available without Docker (GLSim)
   cannot even deploy this contract -- see test_full_agent_lifecycle.py's
   module docstring for the diagnosed root cause (its own stub reimplements
   storage registration incompletely).
2. Even if deployment succeeded, request_evaluation calls
   gl.nondet.exec_prompt, which needs a configured LLM provider; this
   agent has no provider API key, and no StudioNet signing key to use the
   hosted network's own LLM backend as an alternative path either.
"""

import pytest

pytestmark = pytest.mark.skip(
    reason=(
        "BLOCKED: see tests/integration/test_full_agent_lifecycle.py module docstring "
        "for the diagnosed GLSim deployment blocker, and docs/FINAL_HANDOFF.md for the "
        "LLM-provider-key and StudioNet-signing-key blockers stacked on top of it."
    )
)


def test_validators_agree_on_structured_decision_despite_independent_refetch():
    pass


def test_validators_disagree_forces_leader_rotation_on_genuine_semantic_difference():
    pass
