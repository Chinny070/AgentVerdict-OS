"""Identity, delegation, and admin-authorization tests (features 16, 18, 19,
30). See docs/SECURITY_THREAT_MODEL.md for the threats these close.
"""

import json

from conftest import (
    API_MODULE, API_VERSION, AGENT_MODULE, FAR_FUTURE_DEADLINE,
    create_active_agreement,
)


# ---------------------------------------------------------------------------
# module registry admin-gating (feature 30, versioned evaluation modules)
# ---------------------------------------------------------------------------

def test_only_admin_can_register_module(deployed, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.register_module("new-module", "1.0.0", json.dumps({"criteria": []}), "repo")


def test_register_module_rejects_duplicate_version(deployed, direct_vm, direct_owner):
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert():
        deployed.register_module(API_MODULE, API_VERSION, json.dumps({"criteria": []}), "repo")


# ---------------------------------------------------------------------------
# agent identity / passports (feature 16)
# ---------------------------------------------------------------------------

def test_register_agent_self_serve(deployed, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    deployed.register_agent(json.dumps({"skills": ["api-testing"]}))
    passport = deployed.get_agent_passport(direct_alice)
    assert passport["capabilities_json"] == '{"skills": ["api-testing"]}'
    assert passport["revoked"] is False


def test_only_admin_can_revoke_agent(deployed, direct_vm, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    deployed.register_agent("{}")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert():
        deployed.revoke_agent(direct_alice)


def test_revoked_passport_cannot_submit_evidence(deployed, direct_vm, direct_alice, direct_bob, direct_owner):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_owner
    deployed.revoke_agent(direct_alice)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.submit_evidence(agreement_id, "https://example.com/x", "h1", "text/plain", "endpoint_coverage")


def test_revoked_agent_cannot_register_again(deployed, direct_vm, direct_alice, direct_owner):
    direct_vm.sender = direct_alice
    deployed.register_agent("{}")
    direct_vm.sender = direct_owner
    deployed.revoke_agent(direct_alice)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.register_agent(json.dumps({"skills": ["x"]}))


# ---------------------------------------------------------------------------
# delegation (features 18, 19)
# ---------------------------------------------------------------------------

def test_cannot_delegate_on_behalf_of_another_address(deployed, direct_vm, direct_alice, direct_bob, direct_charlie):
    # delegate_scope always uses gl.message.sender_address as parent, so
    # Alice cannot register a delegation that claims Bob as the parent --
    # there is no "on behalf of" parameter at all. We assert the delegation
    # actually created is attributed to the real caller, not a spoofed one.
    direct_vm.sender = direct_alice
    delegation_id = deployed.delegate_scope(direct_bob, json.dumps({"scope": "submit_evidence"}), 0, FAR_FUTURE_DEADLINE)
    delegation = deployed.get_delegation(delegation_id)
    assert delegation["parent"] == direct_alice.as_hex
    assert delegation["parent"] != direct_charlie.as_hex


def test_delegate_cannot_accept_for_another_child(deployed, direct_vm, direct_alice, direct_bob, direct_charlie):
    direct_vm.sender = direct_alice
    delegation_id = deployed.delegate_scope(direct_bob, json.dumps({"scope": "submit_evidence"}), 0, FAR_FUTURE_DEADLINE)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert():
        deployed.accept_delegation(delegation_id)


def test_only_parent_or_admin_can_revoke_delegation(deployed, direct_vm, direct_alice, direct_bob, direct_charlie):
    direct_vm.sender = direct_alice
    delegation_id = deployed.delegate_scope(direct_bob, json.dumps({"scope": "submit_evidence"}), 0, FAR_FUTURE_DEADLINE)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert():
        deployed.revoke_delegation(delegation_id)
    direct_vm.sender = direct_alice
    deployed.revoke_delegation(delegation_id)
    assert deployed.get_delegation(delegation_id)["revoked"] is True


def test_accepted_delegate_can_submit_evidence_for_principal(deployed, direct_vm, direct_alice, direct_bob, direct_charlie):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    delegation_id = deployed.delegate_scope(direct_charlie, json.dumps({"scope": "submit_evidence"}), 0, FAR_FUTURE_DEADLINE)
    direct_vm.sender = direct_charlie
    deployed.accept_delegation(delegation_id)
    evidence_id = deployed.submit_evidence(agreement_id, "https://example.com/x", "h1", "text/plain", "endpoint_coverage")
    assert evidence_id == "E-1"


def test_unaccepted_delegate_cannot_submit_evidence(deployed, direct_vm, direct_alice, direct_bob, direct_charlie):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.delegate_scope(direct_charlie, json.dumps({"scope": "submit_evidence"}), 0, FAR_FUTURE_DEADLINE)
    # deliberately never call accept_delegation
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert():
        deployed.submit_evidence(agreement_id, "https://example.com/x", "h1", "text/plain", "endpoint_coverage")


def test_expired_delegation_cannot_be_accepted(deployed, direct_vm, direct_alice, direct_bob):
    from conftest import PAST_DEADLINE
    direct_vm.sender = direct_alice
    delegation_id = deployed.delegate_scope(direct_bob, json.dumps({"scope": "submit_evidence"}), 0, PAST_DEADLINE)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert():
        deployed.accept_delegation(delegation_id)


# ---------------------------------------------------------------------------
# challenge-resolution admin-gating
# ---------------------------------------------------------------------------

def test_only_admin_can_resolve_challenge(deployed, direct_vm, direct_alice, direct_bob):
    from conftest import mock_evidence_source, mock_llm_decision
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "h1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)

    direct_vm.sender = direct_bob
    challenge_id = deployed.challenge_verdict(agreement_id, "disagree")

    with direct_vm.expect_revert():
        deployed.resolve_challenge(challenge_id, True, "nope, not admin")
