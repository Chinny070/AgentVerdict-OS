"""Full agreement lifecycle, challenges, and recovery (features 5, 38).
See docs/ACCEPTANCE_MATRIX.md for the acceptance cases these cover.
"""

from conftest import create_active_agreement, mock_evidence_source, mock_llm_decision


def test_full_happy_path_pass_decision(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")

    deployed.request_evaluation(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "CHALLENGE_WINDOW"

    direct_vm.warp("2999-06-01T00:00:00Z")
    deployed.finalize_verdict(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "FINALIZED"

    deployed.authorize_settlement(agreement_id)
    deployed.record_settlement(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "SETTLED"

    passport = deployed.get_agent_passport(direct_bob)
    assert passport["completed_count"] == 1
    assert passport["reputation_score"] == 5


def test_challenge_then_resolve_upheld_triggers_reevaluation(deployed, direct_vm, direct_alice, direct_bob, direct_owner):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    direct_vm.sender = direct_bob
    challenge_id = deployed.challenge_verdict(agreement_id, "I believe the endpoint actually returns 500.")
    assert deployed.get_agreement(agreement_id)["state"] == "CHALLENGED"

    direct_vm.sender = direct_owner
    deployed.resolve_challenge(challenge_id, True, "upheld, re-evaluating")
    assert deployed.get_agreement(agreement_id)["state"] == "REEVALUATING"
    assert deployed.get_challenge(challenge_id)["state"] == "UPHELD"

    direct_vm.clear_mocks()
    mock_evidence_source(direct_vm, r"example\.com/readme", body="GET /health returns 500 on every call.")
    mock_llm_decision(direct_vm, decision="FAIL", criteria=[
        {"id": "endpoint_coverage", "status": "FAIL", "reason": "returns 500", "evidence_ids": ["E-1"]},
    ])
    direct_vm.sender = direct_alice
    deployed.request_evaluation(agreement_id)

    verdict = deployed.get_verdict(agreement_id)
    assert verdict["decision"] == "FAIL"
    assert verdict["attempt_no"] == 2


def test_challenge_rejected_original_verdict_stands(deployed, direct_vm, direct_alice, direct_bob, direct_owner):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)
    original_deadline = deployed.get_verdict(agreement_id)["challenge_deadline"]

    direct_vm.sender = direct_bob
    challenge_id = deployed.challenge_verdict(agreement_id, "I don't believe this passed.")

    direct_vm.sender = direct_owner
    deployed.resolve_challenge(challenge_id, False, "rejected, evidence clearly supports PASS")

    assert deployed.get_challenge(challenge_id)["state"] == "REJECTED"
    agreement = deployed.get_agreement(agreement_id)
    assert agreement["state"] == "CHALLENGE_WINDOW"
    verdict = deployed.get_verdict(agreement_id)
    assert verdict["decision"] == "PASS"
    assert verdict["attempt_no"] == 1
    # A fresh challenge window was opened, so the deadline must have moved
    # forward rather than instantly expiring.
    assert verdict["challenge_deadline"] >= original_deadline


def test_second_simultaneous_challenge_rejected(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    direct_vm.sender = direct_bob
    deployed.challenge_verdict(agreement_id, "first challenge")
    with direct_vm.expect_revert():
        deployed.challenge_verdict(agreement_id, "second simultaneous challenge")


def test_request_rework_on_fail_then_recover(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme", body="returns 500")
    mock_llm_decision(direct_vm, decision="FAIL", criteria=[
        {"id": "endpoint_coverage", "status": "FAIL", "reason": "broken", "evidence_ids": ["E-1"]},
    ])
    deployed.request_evaluation(agreement_id)

    deployed.request_rework(agreement_id, "please fix the endpoint and resubmit")
    assert deployed.get_agreement(agreement_id)["state"] == "REMEDIATION_REQUESTED"

    deployed.acknowledge_recovery(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "EVIDENCE_OPEN"

    direct_vm.clear_mocks()
    deployed.submit_evidence(agreement_id, "https://example.com/readme2", "hash-2", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme2", body="now returns 200")
    mock_llm_decision(direct_vm, decision="PASS", criteria=[
        {"id": "endpoint_coverage", "status": "PASS", "reason": "fixed", "evidence_ids": ["E-2"]},
    ])
    deployed.request_evaluation(agreement_id)
    verdict = deployed.get_verdict(agreement_id)
    assert verdict["decision"] == "PASS"
    assert verdict["attempt_no"] == 2


def test_request_rework_rejected_when_remedy_not_rework(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    with direct_vm.expect_revert():
        deployed.request_rework(agreement_id, "should not be allowed, decision was PASS")


def test_cancel_by_rule_after_deadline(deployed, direct_vm, direct_alice, direct_bob):
    from conftest import PAST_DEADLINE
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob, deadline="2999-01-01T00:00:00Z")
    direct_vm.warp("2999-06-01T00:00:00Z")
    direct_vm.sender = direct_alice
    deployed.cancel_by_rule(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "CANCELLED_BY_RULE"


def test_terminate_agreement_requires_escalate_or_max_attempts(deployed, direct_vm, direct_alice, direct_bob, direct_owner):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert():
        deployed.terminate_agreement(agreement_id, "no grounds yet")

    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    direct_vm.mock_llm(r".*", "not json")
    deployed.request_evaluation(agreement_id)  # -> ERROR / ESCALATE

    direct_vm.sender = direct_owner
    deployed.terminate_agreement(agreement_id, "LLM evaluation failed, escalating")
    assert deployed.get_agreement(agreement_id)["state"] == "TERMINATED"
