"""Liveness regression for an upheld challenge on the final evaluation attempt."""

from conftest import create_active_agreement, mock_evidence_source, mock_llm_decision


def test_upheld_challenge_on_last_attempt_terminates_atomically(
    deployed, direct_vm, direct_alice, direct_bob, direct_owner
):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(
        agreement_id, "https://example.com/health", "hash", "text/plain", "endpoint_coverage"
    )
    mock_evidence_source(direct_vm, r"example\.com/health")

    # Exhaust attempts 1 and 2 through legitimate challenged/re-evaluation cycles.
    for expected_attempt in (1, 2):
        mock_llm_decision(direct_vm, "PASS")
        deployed.request_evaluation(agreement_id)
        assert deployed.get_verdict(agreement_id)["attempt_no"] == expected_attempt
        direct_vm.sender = direct_bob
        challenge_id = deployed.challenge_verdict(agreement_id, f"challenge attempt {expected_attempt}")
        direct_vm.sender = direct_owner
        deployed.resolve_challenge(challenge_id, True, "challenge upheld; rerun evaluation")
        assert deployed.get_agreement(agreement_id)["state"] == "REEVALUATING"
        direct_vm.sender = direct_alice

    mock_llm_decision(direct_vm, "PASS")
    deployed.request_evaluation(agreement_id)
    assert deployed.get_verdict(agreement_id)["attempt_no"] == 3

    direct_vm.sender = direct_bob
    final_challenge_id = deployed.challenge_verdict(agreement_id, "challenge final allowed attempt")
    direct_vm.sender = direct_owner
    deployed.resolve_challenge(final_challenge_id, True, "final challenge upheld")

    agreement = deployed.get_agreement(agreement_id)
    challenge = deployed.get_challenge(final_challenge_id)
    verdict = deployed.get_verdict(agreement_id)
    assert agreement["state"] == "TERMINATED"
    assert challenge["state"] == "UPHELD"
    assert "final allowed attempt" in challenge["resolution"]
    assert verdict["state"] == "VOID"
    with direct_vm.expect_revert():
        deployed.get_settlement(agreement_id)
    passport = deployed.get_agent_passport(direct_bob)
    assert passport["completed_count"] == 0
    assert passport["reputation_score"] == 0

    # Terminal state and challenge record make replay and settlement impossible.
    with direct_vm.expect_revert():
        deployed.resolve_challenge(final_challenge_id, True, "replay")
    with direct_vm.expect_revert():
        deployed.authorize_settlement(agreement_id)

