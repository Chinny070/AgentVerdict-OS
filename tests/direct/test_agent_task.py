"""AI-Agent Task Verification flagship module (spec section 5.B).
Validator equivalence strategy is documented in
docs/EQUIVALENCE_MATRIX.md section 3.
"""

import json

from conftest import AGENT_MODULE, create_active_agreement, mock_evidence_source, mock_llm_decision


def test_agent_task_pass_decision(deployed, direct_vm, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob, module_id=AGENT_MODULE)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/report", "hash-1", "text/plain", "task_coverage")
    mock_evidence_source(direct_vm, r"example\.com/report", body="Task report: all deliverables completed on time.")
    mock_llm_decision(direct_vm, decision="PASS", criteria=[
        {"id": "task_coverage", "status": "PASS", "reason": "complete", "evidence_ids": ["E-1"]},
    ])

    deployed.request_evaluation(agreement_id)

    verdict = deployed.get_verdict(agreement_id)
    assert verdict["decision"] == "PASS"
    assert verdict["module_id"] == "agent-task"


def test_agent_task_multi_delegate_inconclusive_causality(deployed, direct_vm, direct_alice, direct_bob, direct_charlie):
    """Conservative multi-agent causality (feature 3 intersection, spec
    invariant 8): when a criterion failure cannot be attributed to a
    specific delegate, the module must not fabricate blame -- it reports
    INSUFFICIENT_EVIDENCE with HIGH uncertainty instead.
    """
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob, module_id=AGENT_MODULE)
    direct_vm.sender = direct_alice
    deployed.submit_evidence(agreement_id, "https://example.com/report", "hash-1", "text/plain", "task_coverage")
    mock_evidence_source(direct_vm, r"example\.com/report", body="Two delegates worked on this; unclear who caused the gap.")
    mock_llm_decision(
        direct_vm, decision="PARTIAL", uncertainty="HIGH",
        criteria=[{"id": "task_coverage", "status": "INSUFFICIENT_EVIDENCE", "reason": "cannot attribute to a specific delegate", "evidence_ids": ["E-1"]}],
    )

    deployed.request_evaluation(agreement_id)
    verdict = deployed.get_verdict(agreement_id)
    assert verdict["uncertainty"] == "HIGH"
    assert verdict["criteria"][0]["status"] == "INSUFFICIENT_EVIDENCE"


def test_agent_task_module_version_bound_to_agreement(deployed, direct_vm, direct_owner, direct_alice, direct_bob):
    agreement_id = create_active_agreement(deployed, direct_vm, direct_alice, direct_bob, module_id=AGENT_MODULE)

    direct_vm.sender = direct_owner
    deployed.register_module(AGENT_MODULE, "2.0.0", json.dumps({"criteria": ["task_coverage"]}), "repo,report,url")

    agreement = deployed.get_agreement(agreement_id)
    # The agreement was created before the new version was registered, so
    # it must stay bound to the version frozen at creation time (feature
    # 30, versioned evaluation modules) -- a later module upgrade must
    # never silently reach backward into an already-created agreement.
    assert agreement["module_version"] == "1.0.0"
    assert deployed.get_latest_module_version(AGENT_MODULE) == "2.0.0"
