"""Shared fixtures and helpers for AgentVerdict OS direct-mode tests.

See docs/GENLAYER_CAPABILITY_MATRIX.md section 4 for what direct mode can
and cannot exercise, and docs/STATE_MACHINE.md for the full agreement
lifecycle these helpers drive through.
"""

import json

import pytest

POLICY_ID = "pt-api-1"
API_MODULE = "api-delivery"
API_VERSION = "1.0.0"
AGENT_MODULE = "agent-task"
AGENT_VERSION = "1.0.0"
CHALLENGE_WINDOW_SECONDS = 3600
FAR_FUTURE_DEADLINE = "2999-01-01T00:00:00Z"
PAST_DEADLINE = "2024-01-01T00:00:00Z"


@pytest.fixture
def deployed(direct_vm, direct_deploy, direct_owner):
    """Deploy the contract as direct_owner (becomes admin) and register
    both flagship modules plus one active policy template.
    """
    direct_vm.sender = direct_owner
    contract = direct_deploy("contracts/agentverdict.py")

    contract.register_module(
        API_MODULE, API_VERSION,
        json.dumps({"criteria": ["endpoint_coverage", "error_handling"]}),
        "url,repo,api,test_output",
    )
    contract.register_module(
        AGENT_MODULE, AGENT_VERSION,
        json.dumps({"criteria": ["task_coverage"]}),
        "url,repo,report",
    )
    contract.register_policy_template(
        POLICY_ID, "0xpolicyhash", CHALLENGE_WINDOW_SECONDS,
        "repo,api,test_output,report,url",
    )
    return contract


def make_rubric(criteria_ids=("endpoint_coverage",)):
    return json.dumps({
        "criteria": [{"id": cid, "description": "auto-generated test criterion"} for cid in criteria_ids]
    })


def create_draft_agreement(
    contract, direct_vm, creator, counterparty,
    module_id=API_MODULE, deadline=FAR_FUTURE_DEADLINE, amount_atto=1000,
    rubric_json=None,
):
    direct_vm.sender = creator
    return contract.create_agreement(
        counterparty, POLICY_ID, module_id, amount_atto, deadline,
        rubric_json if rubric_json is not None else make_rubric(),
    )


def create_active_agreement(
    contract, direct_vm, creator, counterparty,
    module_id=API_MODULE, deadline=FAR_FUTURE_DEADLINE, amount_atto=1000, rubric_json=None,
):
    agreement_id = create_draft_agreement(
        contract, direct_vm, creator, counterparty, module_id, deadline, amount_atto, rubric_json,
    )
    contract.propose_agreement(agreement_id)
    direct_vm.sender = counterparty
    contract.accept_agreement(agreement_id)
    direct_vm.sender = creator
    contract.activate_agreement(agreement_id)
    contract.open_evidence(agreement_id)
    return agreement_id


def mock_evidence_source(direct_vm, url_fragment, body="Documented endpoints: GET /health returns 200.", status=200):
    direct_vm.mock_web(url_fragment, {"status": status, "body": body})


def mock_llm_decision(direct_vm, decision="PASS", criteria=None, uncertainty="LOW", pattern=r".*"):
    if criteria is None:
        criteria = [{"id": "endpoint_coverage", "status": "PASS", "reason": "verified", "evidence_ids": ["E-1"]}]
    direct_vm.mock_llm(pattern, json.dumps({"decision": decision, "criteria": criteria, "uncertainty": uncertainty}))
