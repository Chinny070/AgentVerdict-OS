"""Stage 6 fix: permissionless challenge-resolution timeout recovery.

Covers docs/SECURITY_THREAT_MODEL.md item 8 ("Unbounded challenge-resolution
latency") -- before this fix, an admin who never called resolve_challenge
left an agreement stuck in CHALLENGED forever, because finalize_verdict's
challenge-window check only ever fires in CHALLENGE_WINDOW, a state that
filing a challenge leaves and (previously) only resolve_challenge could
re-enter.

See docs/STAGE_6_MIGRATION_NOTE.md for the full design rationale (duration
choice, eligibility choice, outcome choice) this test file exercises.
"""

from conftest import (
    CHALLENGE_WINDOW_SECONDS,
    create_active_agreement,
    mock_evidence_source,
    mock_llm_decision,
)


def _file_challenge(deployed, direct_vm, direct_alice, direct_bob):
    """Helper: drive an agreement to a filed, OPEN challenge and return
    (agreement_id, challenge_id).
    """
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    direct_vm.sender = direct_bob
    challenge_id = deployed.challenge_verdict(agreement_id, "I don't believe this actually passed.")
    assert deployed.get_agreement(agreement_id)["state"] == "CHALLENGED"
    return agreement_id, challenge_id


def test_resolution_deadline_set_on_challenge_filing(deployed, direct_vm, direct_alice, direct_bob):
    direct_vm.warp("2500-01-01T00:00:00Z")
    agreement_id, challenge_id = _file_challenge(deployed, direct_vm, direct_alice, direct_bob)

    challenge = deployed.get_challenge(challenge_id)
    assert challenge["state"] == "OPEN"
    assert challenge["submitted_at"] == "2500-01-01T00:00:00Z"
    # Duration reuses the agreement's policy challenge_window_seconds
    # (see conftest.CHALLENGE_WINDOW_SECONDS == 3600) -- a deliberate
    # choice documented in docs/STAGE_6_MIGRATION_NOTE.md, not an
    # arbitrary new constant.
    expected_deadline = "2500-01-01T01:00:00Z"
    assert challenge["resolution_deadline"] == expected_deadline


def test_legitimate_admin_resolution_still_works_before_deadline(
    deployed, direct_vm, direct_alice, direct_bob, direct_owner
):
    direct_vm.warp("2500-01-01T00:00:00Z")
    agreement_id, challenge_id = _file_challenge(deployed, direct_vm, direct_alice, direct_bob)

    # Well before the 3600s resolution deadline.
    direct_vm.warp("2500-01-01T00:10:00Z")
    direct_vm.sender = direct_owner
    deployed.resolve_challenge(challenge_id, False, "rejected, evidence supports PASS")

    challenge = deployed.get_challenge(challenge_id)
    assert challenge["state"] == "REJECTED"
    assert deployed.get_agreement(agreement_id)["state"] == "CHALLENGE_WINDOW"

    # resolve_challenge_by_timeout must now be a no-op path (challenge no
    # longer OPEN) regardless of elapsed time.
    direct_vm.warp("2500-01-01T05:00:00Z")
    with direct_vm.expect_revert():
        deployed.resolve_challenge_by_timeout(challenge_id)


def test_timeout_recovery_rejected_before_deadline(deployed, direct_vm, direct_alice, direct_bob):
    direct_vm.warp("2500-01-01T00:00:00Z")
    agreement_id, challenge_id = _file_challenge(deployed, direct_vm, direct_alice, direct_bob)

    # Only 10 minutes have passed, deadline is at +3600s.
    direct_vm.warp("2500-01-01T00:10:00Z")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert():
        deployed.resolve_challenge_by_timeout(challenge_id)

    # Challenge must remain untouched -- still OPEN, no premature effect.
    challenge = deployed.get_challenge(challenge_id)
    assert challenge["state"] == "OPEN"
    assert deployed.get_agreement(agreement_id)["state"] == "CHALLENGED"


def test_timeout_recovery_succeeds_after_deadline(deployed, direct_vm, direct_alice, direct_bob):
    direct_vm.warp("2500-01-01T00:00:00Z")
    agreement_id, challenge_id = _file_challenge(deployed, direct_vm, direct_alice, direct_bob)

    # Past the 3600s resolution deadline, admin never acted.
    direct_vm.warp("2500-01-01T02:00:00Z")
    direct_vm.sender = direct_bob
    deployed.resolve_challenge_by_timeout(challenge_id)

    challenge = deployed.get_challenge(challenge_id)
    assert challenge["state"] == "TIMEOUT_REJECTED"
    assert "[TIMEOUT]" in challenge["resolution"]

    agreement = deployed.get_agreement(agreement_id)
    assert agreement["state"] == "CHALLENGE_WINDOW"


def test_timeout_recovery_is_permissionless_any_caller_may_invoke(
    deployed, direct_vm, direct_alice, direct_bob, direct_charlie
):
    """direct_charlie is neither the agreement's creator/counterparty, nor
    the challenger, nor the protocol admin -- a fully unrelated address.
    The timeout outcome is deterministic and identical no matter who
    calls it (see docs/STAGE_6_MIGRATION_NOTE.md for why eligibility is
    deliberately unrestricted), so this call must succeed.
    """
    direct_vm.warp("2500-01-01T00:00:00Z")
    agreement_id, challenge_id = _file_challenge(deployed, direct_vm, direct_alice, direct_bob)

    direct_vm.warp("2500-01-01T02:00:00Z")
    direct_vm.sender = direct_charlie
    deployed.resolve_challenge_by_timeout(challenge_id)

    assert deployed.get_challenge(challenge_id)["state"] == "TIMEOUT_REJECTED"
    assert deployed.get_agreement(agreement_id)["state"] == "CHALLENGE_WINDOW"


def test_double_call_timeout_recovery_is_rejected_idempotent(deployed, direct_vm, direct_alice, direct_bob):
    direct_vm.warp("2500-01-01T00:00:00Z")
    agreement_id, challenge_id = _file_challenge(deployed, direct_vm, direct_alice, direct_bob)

    direct_vm.warp("2500-01-01T02:00:00Z")
    direct_vm.sender = direct_bob
    deployed.resolve_challenge_by_timeout(challenge_id)
    first_resolution = deployed.get_challenge(challenge_id)["resolution"]

    # Second call, same challenge, time still well past the deadline --
    # must revert because state is no longer OPEN, and must NOT re-apply
    # any effect (no double reopening of the challenge window, no
    # duplicated verdict mutation).
    with direct_vm.expect_revert():
        deployed.resolve_challenge_by_timeout(challenge_id)

    challenge = deployed.get_challenge(challenge_id)
    assert challenge["state"] == "TIMEOUT_REJECTED"
    assert challenge["resolution"] == first_resolution


def test_timeout_outcome_upholds_original_verdict_through_to_finalization(
    deployed, direct_vm, direct_alice, direct_bob
):
    """End-to-end: timeout recovery must route through the SAME
    finalize_verdict/_apply_reputation_event path as every other route to
    FINALIZED -- not a parallel settlement/reputation implementation. The
    original PASS verdict (attempt_no == 1) must be what gets finalized
    and rewarded, proving timeout does not silently conjure a new verdict
    or skip the normal challenge-window-must-be-clear gate.
    """
    direct_vm.warp("2500-01-01T00:00:00Z")
    agreement_id, challenge_id = _file_challenge(deployed, direct_vm, direct_alice, direct_bob)

    original_verdict = deployed.get_verdict(agreement_id)
    assert original_verdict["decision"] == "PASS"
    assert original_verdict["attempt_no"] == 1

    direct_vm.warp("2500-01-01T02:00:00Z")
    direct_vm.sender = direct_alice
    deployed.resolve_challenge_by_timeout(challenge_id)
    assert deployed.get_agreement(agreement_id)["state"] == "CHALLENGE_WINDOW"

    # finalize_verdict must still be blocked while the freshly reopened
    # window is open.
    with direct_vm.expect_revert():
        deployed.finalize_verdict(agreement_id)

    # Fresh window = now + CHALLENGE_WINDOW_SECONDS; warp past it.
    direct_vm.warp("2500-01-01T03:00:01Z")
    deployed.finalize_verdict(agreement_id)

    finalized_agreement = deployed.get_agreement(agreement_id)
    assert finalized_agreement["state"] == "FINALIZED"
    final_verdict = deployed.get_verdict(agreement_id)
    assert final_verdict["decision"] == "PASS"
    assert final_verdict["attempt_no"] == 1  # same original verdict, not re-evaluated
    assert final_verdict["state"] == "FINAL"

    # Reputation event recorded exactly as the normal finalize_verdict
    # tail already does for a PASS decision (+5) -- same code path, no
    # divergent timeout-specific reputation logic.
    passport = deployed.get_agent_passport(direct_bob)
    assert passport["completed_count"] == 1
    assert passport["reputation_score"] == 5

    # Settlement remains reachable exactly as normal.
    deployed.authorize_settlement(agreement_id)
    deployed.record_settlement(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "SETTLED"


def test_timeout_recovery_requires_challenged_state(deployed, direct_vm, direct_alice, direct_bob, direct_owner):
    """A challenge_id that was already resolved UPHELD (agreement moved to
    REEVALUATING, not CHALLENGED) must not be timeout-recoverable --
    guards the ag.state == ST_CHALLENGED check independent of ch.state.
    """
    direct_vm.warp("2500-01-01T00:00:00Z")
    agreement_id, challenge_id = _file_challenge(deployed, direct_vm, direct_alice, direct_bob)

    direct_vm.sender = direct_owner
    deployed.resolve_challenge(challenge_id, True, "upheld, re-evaluating")
    assert deployed.get_agreement(agreement_id)["state"] == "REEVALUATING"

    direct_vm.warp("2500-01-01T05:00:00Z")
    with direct_vm.expect_revert():
        deployed.resolve_challenge_by_timeout(challenge_id)


def test_timeout_recovery_unknown_challenge_id_reverts(deployed, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.resolve_challenge_by_timeout("C-does-not-exist")
