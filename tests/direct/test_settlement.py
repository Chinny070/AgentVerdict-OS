"""Settlement Safety Vault tests (feature 39). See
docs/PROTOCOL_ARCHITECTURE.md section 5 for why native GEN transfer is
disabled by default, and docs/SECURITY_THREAT_MODEL.md for the
double-settlement threat these tests close.
"""

from conftest import create_active_agreement, mock_evidence_source, mock_llm_decision


def _finalize_pass(deployed, direct_vm, direct_alice, direct_bob, amount_atto=1000):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob, amount_atto=amount_atto)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/readme", "hash-1", "text/plain", "endpoint_coverage")
    mock_evidence_source(direct_vm, r"example\.com/readme")
    mock_llm_decision(direct_vm, decision="PASS")
    deployed.request_evaluation(agreement_id)
    direct_vm.warp("2999-06-01T00:00:00Z")
    deployed.finalize_verdict(agreement_id)
    return agreement_id


def test_authorize_settlement_idempotent(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = _finalize_pass(deployed, direct_vm, direct_alice, direct_bob)
    deployed.authorize_settlement(agreement_id)
    with direct_vm.expect_revert():
        deployed.authorize_settlement(agreement_id)


def test_double_settlement_rejected(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = _finalize_pass(deployed, direct_vm, direct_alice, direct_bob)
    deployed.authorize_settlement(agreement_id)
    deployed.record_settlement(agreement_id)
    assert deployed.get_settlement(agreement_id)["status"] == "EXECUTED"
    with direct_vm.expect_revert():
        deployed.record_settlement(agreement_id)


def test_record_settlement_without_authorization_rejected(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = _finalize_pass(deployed, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert():
        deployed.record_settlement(agreement_id)


def test_rework_blocked_after_settlement_authorized(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = _finalize_pass(deployed, direct_vm, direct_alice, direct_bob)
    deployed.authorize_settlement(agreement_id)
    with direct_vm.expect_revert():
        deployed.request_rework(agreement_id, "too late, settlement already authorized")


def test_settlement_disabled_by_default(deployed):
    stats = deployed.get_protocol_stats()
    assert stats["settlement_native_transfer_enabled"] is False


def test_native_transfer_flag_admin_only(deployed, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        deployed.set_settlement_native_transfer_enabled(True)


def test_native_transfer_enabled_blocks_record_settlement_as_unverified_stub(deployed, direct_vm, direct_alice, direct_bob, direct_owner):
    """Settlement Safety Vault, "safe disabled mode" branch: flipping the
    flag on must never produce a silent fake success. It must honestly
    block record_settlement until a verified transfer call is wired in a
    future session (see docs/PROTOCOL_ARCHITECTURE.md section 5).
    """
    agreement_id = _finalize_pass(deployed, direct_vm, direct_alice, direct_bob)
    deployed.authorize_settlement(agreement_id)

    direct_vm.sender = direct_owner
    deployed.set_settlement_native_transfer_enabled(True)

    with direct_vm.expect_revert():
        deployed.record_settlement(agreement_id)

    # The idempotency-first write (status -> EXECUTED) still happened
    # before the stub raised, so the settlement can never be re-authorized
    # or re-executed from a retry -- but the honest error must be visible.
    settlement = deployed.get_settlement(agreement_id)
    assert settlement["status"] == "EXECUTED"
