"""API Delivery Verification flagship module (spec section 5.A). Validator
equivalence strategy is documented in docs/EQUIVALENCE_MATRIX.md section 2.
"""

from conftest import create_active_agreement, make_rubric, mock_evidence_source, mock_llm_decision


def test_pass_decision_full_evaluation(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")

    deployed.request_evaluation(agreement_id)

    verdict = deployed.get_verdict(agreement_id)
    assert verdict["decision"] == "PASS"
    assert verdict["state"] == "PROVISIONAL"
    assert verdict["module_id"] == "api-delivery"
    assert verdict["remedy"] == "NONE"

    agreement = deployed.get_agreement(agreement_id)
    assert agreement["state"] == "CHALLENGE_WINDOW"


def test_fail_decision_blocks_settlement_authorization(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme", body="GET /health returns 500 always.")
    mock_llm_decision(direct_vm, decision="FAIL", criteria=[
        {"id": "endpoint_coverage", "status": "FAIL", "reason": "server error", "evidence_ids": ["E-1"]},
    ])

    deployed.request_evaluation(agreement_id)
    direct_vm.warp("2999-06-01T00:00:00Z")
    deployed.finalize_verdict(agreement_id)

    with direct_vm.expect_revert():
        deployed.authorize_settlement(agreement_id)


def test_partial_decision_allows_authorize_settlement(deployed, direct_vm, direct_alice, direct_bob):
    rubric = make_rubric(("endpoint_coverage", "error_handling"))
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob, amount_atto=1000, rubric_json=rubric)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    deployed.submit_evidence(agreement_id, "https://example.com/errors", "hash-2", "text/plain", "error_handling")
    mock_evidence_source(direct_vm, r"example\.com/readme", status=404)
    mock_evidence_source(direct_vm, r"example\.com/errors", body="Error responses documented")
    mock_llm_decision(direct_vm, decision="PASS", criteria=[
        {"id": "endpoint_coverage", "status": "PASS", "reason": "claims ok", "evidence_ids": ["E-1"]},
        {"id": "error_handling", "status": "PASS", "reason": "documented", "evidence_ids": ["E-2"]},
    ])

    deployed.request_evaluation(agreement_id)
    verdict = deployed.get_verdict(agreement_id)
    assert verdict["decision"] == "PARTIAL"  # derived from mixed PASS/INSUFFICIENT criteria

    direct_vm.warp("2999-06-01T00:00:00Z")
    deployed.finalize_verdict(agreement_id)
    deployed.authorize_settlement(agreement_id)

    settlement = deployed.get_settlement(agreement_id)
    assert settlement["status"] == "AUTHORIZED"
    assert settlement["amount_atto"] == 500


def test_no_evidence_blocks_request_evaluation(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.request_evaluation(agreement_id)


def test_unreachable_api_yields_insufficient_evidence_or_evaluation_error(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/down", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/down", status=503, body="service unavailable")
    mock_llm_decision(direct_vm, decision="INSUFFICIENT_EVIDENCE", criteria=[
        {"id": "endpoint_coverage", "status": "INSUFFICIENT_EVIDENCE", "reason": "source down", "evidence_ids": []},
    ])

    deployed.request_evaluation(agreement_id)
    verdict = deployed.get_verdict(agreement_id)
    assert verdict["decision"] == "INSUFFICIENT_EVIDENCE"
    assert verdict["remedy"] == "RETRY"


def test_contradictory_evidence_downgrades_to_insufficient(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/unreachable", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/unreachable", status=404)
    mock_llm_decision(direct_vm, decision="PASS", criteria=[
        {"id": "endpoint_coverage", "status": "PASS", "reason": "LLM claims pass despite unreachable source", "evidence_ids": ["E-1"]},
    ])

    deployed.request_evaluation(agreement_id)
    verdict = deployed.get_verdict(agreement_id)
    assert verdict["criteria"][0]["status"] == "INSUFFICIENT_EVIDENCE"
    assert "downgraded" in verdict["criteria"][0]["reason"]


def test_malformed_llm_json_raises_llm_error(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    direct_vm.mock_llm(r".*", "not json at all, just prose")

    deployed.request_evaluation(agreement_id)

    agreement = deployed.get_agreement(agreement_id)
    assert agreement["state"] == "EVALUATION_ERROR"
    verdict = deployed.get_verdict(agreement_id)
    assert verdict["decision"] == "ERROR"
    assert verdict["remedy"] == "ESCALATE"


def test_validator_disagrees_on_different_decision(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    agree = direct_vm.run_validator()
    assert agree is True

    forged_fail = {
        "decision": "FAIL",
        "criteria": [{"id": "endpoint_coverage", "status": "FAIL", "reason": "forged", "evidence_ids": ["E-1"]}],
        "uncertainty": "LOW",
    }
    assert direct_vm.run_validator(leader_result=forged_fail) is False


def test_validator_independent_refetch_can_disagree(deployed, direct_vm, direct_alice, direct_bob):
    """Simulates a leader seeing one version of a page and a validator's
    independent refetch seeing different content (the "changing page"
    acceptance case) by swapping mocks between the leader call and the
    run_validator() replay.
    """
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme", body="GET /health returns 200.")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    # Swap to a world where the page now looks broken -- the validator's
    # independent re-run (triggered by run_validator()) must disagree.
    direct_vm.clear_mocks()
    mock_evidence_source(direct_vm, r"example\.com/readme", body="GET /health returns 500 now.")
    mock_llm_decision(direct_vm, decision="FAIL", criteria=[
        {"id": "endpoint_coverage", "status": "FAIL", "reason": "now broken", "evidence_ids": ["E-1"]},
    ])

    assert direct_vm.run_validator() is False
