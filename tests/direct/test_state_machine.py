"""Legal/illegal agreement-state transitions. See docs/STATE_MACHINE.md for
the authoritative transition table these tests enforce.
"""

from conftest import (
    API_MODULE, FAR_FUTURE_DEADLINE, PAST_DEADLINE, POLICY_ID,
    create_active_agreement, create_draft_agreement, make_rubric,
    mock_evidence_source, mock_llm_decision,
)


# ---------------------------------------------------------------------------
# create_agreement guards
# ---------------------------------------------------------------------------

def test_create_agreement_rejects_empty_rubric(deployed, direct_vm, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.create_agreement(direct_bob, POLICY_ID, API_MODULE, 1000, FAR_FUTURE_DEADLINE, "")


def test_create_agreement_rejects_inactive_policy(deployed, direct_vm, direct_alice, direct_bob, direct_owner):
    direct_vm.sender = direct_owner
    deployed.update_policy_template(POLICY_ID, "0xhash2", 3600, "repo", False)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.create_agreement(direct_bob, POLICY_ID, API_MODULE, 1000, FAR_FUTURE_DEADLINE, make_rubric())


def test_create_agreement_rejects_unknown_module(deployed, direct_vm, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.create_agreement(direct_bob, POLICY_ID, "nonexistent-module", 1000, FAR_FUTURE_DEADLINE, make_rubric())


def test_create_agreement_rejects_self_counterparty(deployed, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.create_agreement(direct_alice, POLICY_ID, API_MODULE, 1000, FAR_FUTURE_DEADLINE, make_rubric())


# ---------------------------------------------------------------------------
# propose / accept / decline / expire
# ---------------------------------------------------------------------------

def test_accept_agreement_rejects_from_draft_state(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert():
        deployed.accept_agreement(agreement_id)


def test_accept_agreement_rejects_when_called_by_creator(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob)
    deployed.propose_agreement(agreement_id)
    with direct_vm.expect_revert():
        deployed.accept_agreement(agreement_id)


def test_decline_agreement_only_counterparty(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob)
    deployed.propose_agreement(agreement_id)
    with direct_vm.expect_revert():
        deployed.decline_agreement(agreement_id)
    direct_vm.sender = direct_bob
    deployed.decline_agreement(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "DECLINED"


def test_expire_agreement_after_deadline(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob, deadline=PAST_DEADLINE)
    deployed.propose_agreement(agreement_id)
    deployed.expire_agreement(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "EXPIRED"


def test_expire_agreement_rejects_before_deadline(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob)
    deployed.propose_agreement(agreement_id)
    with direct_vm.expect_revert():
        deployed.expire_agreement(agreement_id)


def test_accept_after_deadline_rejected(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob, deadline=PAST_DEADLINE)
    deployed.propose_agreement(agreement_id)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert():
        deployed.accept_agreement(agreement_id)


# ---------------------------------------------------------------------------
# activate / open_evidence / submit_evidence ordering
# ---------------------------------------------------------------------------

def test_activate_agreement_requires_accepted_state(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert():
        deployed.activate_agreement(agreement_id)


def test_submit_evidence_rejected_before_evidence_open(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob)
    deployed.propose_agreement(agreement_id)
    direct_vm.sender = direct_bob
    deployed.accept_agreement(agreement_id)
    direct_vm.sender = direct_alice
    deployed.activate_agreement(agreement_id)
    # ACTIVE but open_evidence not yet called
    with direct_vm.expect_revert():
        deployed.submit_evidence(agreement_id, "https://example.com/x", "h1", "text/plain", "endpoint_coverage")


def test_request_evaluation_requires_evidence_open_state(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert():
        deployed.request_evaluation(agreement_id)


def test_no_evidence_blocks_request_evaluation(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.request_evaluation(agreement_id)


# ---------------------------------------------------------------------------
# challenge window / finalize guards
# ---------------------------------------------------------------------------

def test_challenge_verdict_rejected_after_deadline(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "h1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    direct_vm.warp("2999-06-01T00:00:00Z")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert():
        deployed.challenge_verdict(agreement_id, "too late")


def test_finalize_verdict_rejected_before_deadline(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "h1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    with direct_vm.expect_revert():
        deployed.finalize_verdict(agreement_id)


def test_finalize_verdict_rejected_while_challenge_open(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "h1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    direct_vm.sender = direct_bob
    deployed.challenge_verdict(agreement_id, "disagree with this verdict")

    direct_vm.warp("2999-06-01T00:00:00Z")
    with direct_vm.expect_revert():
        deployed.finalize_verdict(agreement_id)


# ---------------------------------------------------------------------------
# terminal-state immutability (negative test 14 from docs/STATE_MACHINE.md)
# ---------------------------------------------------------------------------

def test_terminal_state_rejects_further_writes(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_draft_agreement(deployed, direct_vm, direct_alice, direct_bob)
    deployed.propose_agreement(agreement_id)
    direct_vm.sender = direct_bob
    deployed.decline_agreement(agreement_id)
    assert deployed.get_agreement(agreement_id)["state"] == "DECLINED"
    with direct_vm.expect_revert():
        deployed.accept_agreement(agreement_id)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.activate_agreement(agreement_id)
