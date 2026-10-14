"""Focused Stage 11 exploit regressions for state, evidence, policy, and accounting."""
import json

from conftest import (
    API_MODULE, FAR_FUTURE_DEADLINE, POLICY_ID, create_active_agreement,
    create_draft_agreement, make_rubric, mock_evidence_source, mock_llm_decision,
)


def _submit_and_pass(contract, direct_vm, agreement_id, creator, evidence_id="E-1", url="https://example.com/a", content_hash="h1"):
    direct_vm.sender = creator
    contract.submit_evidence(agreement_id, url, content_hash, "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, "example\\.com/", body="public endpoint response")
    mock_llm_decision(direct_vm, "PASS", [{"id": "endpoint_coverage", "status": "PASS", "reason": "verified", "evidence_ids": [evidence_id]}])
    contract.request_evaluation(agreement_id)


def test_cancel_by_rule_cannot_bypass_challenge_or_finality(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    _submit_and_pass(deployed, direct_vm, agreement_id, direct_alice)
    direct_vm.sender = direct_bob
    deployed.challenge_verdict(agreement_id, "challenge finality guard")
    direct_vm.warp("2999-06-01T00:00:00Z")
    with direct_vm.expect_revert():
        deployed.cancel_by_rule(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "CHALLENGED"


def test_record_settlement_rejects_non_finalized_agreement_without_mutation(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    _submit_and_pass(deployed, direct_vm, agreement_id, direct_alice)
    direct_vm.warp("2999-06-01T00:00:00Z")
    deployed.finalize_verdict(agreement_id)
    deployed.authorize_settlement(agreement_id)
    ag = deployed.agreements[agreement_id]
    ag.state = "CANCELLED_BY_RULE"
    deployed.agreements[agreement_id] = ag
    with direct_vm.expect_revert():
        deployed.record_settlement(agreement_id)
    assert deployed.get_settlement(agreement_id)["status"] == "AUTHORIZED"


def test_a_verdict_attempt_can_only_be_challenged_once(deployed, direct_vm, direct_alice, direct_bob, direct_owner):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    _submit_and_pass(deployed, direct_vm, agreement_id, direct_alice)
    direct_vm.sender = direct_bob
    challenge_id = deployed.challenge_verdict(agreement_id, "first challenge")
    direct_vm.sender = direct_owner
    deployed.resolve_challenge(challenge_id, False, "rejected")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.challenge_verdict(agreement_id, "repeat same attempt")


def test_policy_timing_and_allowed_evidence_are_frozen_at_creation(deployed, direct_vm, direct_owner, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_owner
    deployed.update_policy_template(POLICY_ID, "0xupdated", 10, "report", True)
    ag = deployed.get_agreement(agreement_id)
    assert ag["challenge_window_seconds"] == 3600
    assert ag["allowed_evidence_csv"] == "repo,api,test_output,report,url"


def test_policy_that_disallows_url_evidence_rejects_url_submission(deployed, direct_vm, direct_owner, direct_alice, direct_bob):
    direct_vm.sender = direct_owner
    deployed.register_policy_template("no-url", "0xpolicy", 60, "report")
    direct_vm.sender = direct_alice
    agreement_id = deployed.create_agreement(
        direct_bob, "no-url", API_MODULE, 1000, FAR_FUTURE_DEADLINE,
        make_rubric(("endpoint_coverage",)),
    )
    deployed.propose_agreement(agreement_id)
    direct_vm.sender = direct_bob
    deployed.accept_agreement(agreement_id)
    direct_vm.sender = direct_alice
    deployed.activate_agreement(agreement_id)
    deployed.open_evidence(agreement_id)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.submit_evidence(agreement_id, "https://example.com/a", "h1", "text/plain", "endpoint_coverage")


def test_delegate_must_have_submit_evidence_permission(deployed, direct_vm, direct_alice, direct_bob, direct_charlie):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    did = deployed.delegate_scope(direct_charlie, json.dumps({"permissions": ["request_evaluation"]}), 0, FAR_FUTURE_DEADLINE)
    direct_vm.sender = direct_charlie
    deployed.accept_delegation(did)
    with direct_vm.expect_revert():
        deployed.submit_evidence(agreement_id, "https://example.com/a", "h1", "text/plain", "endpoint_coverage")


def test_incomplete_criterion_set_is_not_adjudicated(deployed, direct_vm, direct_alice, direct_bob):
    rubric = make_rubric(("endpoint_coverage", "error_handling"))
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob, rubric_json=rubric)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/a", "h1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, "example\\.com/a")
    mock_llm_decision(direct_vm, "PASS", [{"id": "endpoint_coverage", "status": "PASS", "reason": "only one", "evidence_ids": ["E-1"]}])
    deployed.request_evaluation(agreement_id)
    assert deployed.get_verdict(agreement_id)["decision"] == "ERROR"
    assert deployed.get_agreement(agreement_id)["state"] == "EVALUATION_ERROR"


def test_evidence_reference_must_exist_and_match_criterion(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/a", "h1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, "example\\.com/a")
    mock_llm_decision(direct_vm, "PASS", [{"id": "endpoint_coverage", "status": "PASS", "reason": "fabricated reference", "evidence_ids": ["E-999"]}])
    deployed.request_evaluation(agreement_id)
    assert deployed.get_verdict(agreement_id)["decision"] == "ERROR"


def test_decision_is_derived_from_complete_criterion_statuses(deployed, direct_vm, direct_alice, direct_bob):
    rubric = make_rubric(("endpoint_coverage", "error_handling"))
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob, rubric_json=rubric)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/a", "h1", "text/plain", "endpoint_coverage")
    deployed.submit_evidence(agreement_id, "https://example.com/b", "h2", "text/plain", "error_handling")
    mock_evidence_source(direct_vm, "example\\.com/a")
    mock_evidence_source(direct_vm, "example\\.com/b")
    mock_llm_decision(direct_vm, "PASS", [
        {"id": "endpoint_coverage", "status": "PASS", "reason": "passed", "evidence_ids": ["E-1"]},
        {"id": "error_handling", "status": "FAIL", "reason": "failed", "evidence_ids": ["E-2"]},
    ])
    deployed.request_evaluation(agreement_id)
    assert deployed.get_verdict(agreement_id)["decision"] == "PARTIAL"


def test_attempt_limit_blocks_a_fourth_evaluation(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/a", "h1", "text/plain", "endpoint_coverage")
    ag = deployed.agreements[agreement_id]
    ag.attempt_no = 3
    deployed.agreements[agreement_id] = ag
    with direct_vm.expect_revert():
        deployed.request_evaluation(agreement_id)


def test_finalized_reputation_is_reversed_when_verdict_is_superseded(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/a", "h1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, "example\\.com/a", body="returns 500")
    mock_llm_decision(direct_vm, "FAIL", [{"id": "endpoint_coverage", "status": "FAIL", "reason": "broken", "evidence_ids": ["E-1"]}])
    deployed.request_evaluation(agreement_id)
    direct_vm.warp("2999-06-01T00:00:00Z")
    deployed.finalize_verdict(agreement_id)
    assert deployed.get_agent_passport(direct_bob)["reputation_score"] == -5
    deployed.request_rework(agreement_id, "supersede after rework")
    passport = deployed.get_agent_passport(direct_bob)
    assert passport["reputation_score"] == 0
    assert passport["disputed_count"] == 0

