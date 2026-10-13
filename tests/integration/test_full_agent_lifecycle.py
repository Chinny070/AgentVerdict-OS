"""Real multi-validator consensus integration test for the core agreement
lifecycle, run against a local GLSim network (``glsim --port 4000
--validators 3 --chain-id 61999``).

RESULT OF THE REAL ATTEMPT MADE IN THIS SESSION (not a guess): deployment
itself failed on GLSim with a genuine 1-leader + 2-validator unanimous
"agree" vote that the contract's storage class is not GenVM-loadable:

    "class is not marked for usage within storage, please, annotate it
    with @allow_storage" for class AgentVerdictOS

This was investigated to a diagnosed root cause, not left as an unexplained
failure:

1. direct-mode testing (``gltest tests/direct/``, 68/68 passing) uses the
   REAL downloaded pinned runner artifacts for hash
   ``1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`` (resolved to SDK
   version v0.2.16, cached under
   ``~/.cache/gltest-direct/extracted/v0.2.16/``). Reading that real SDK's
   ``genlayer/gl/genvm_contracts.py`` shows ``Contract.__init_subclass__``
   automatically calls ``generate_storage(cls)``, which calls
   ``allow_storage(cls)`` -- so a plain ``class AgentVerdictOS(gl.Contract):``
   with no extra decorator is correctly auto-registered the moment Python
   parses the class statement. This is why direct mode has never had a
   problem with it, across 68 passing tests exercising deploy + every write
   method.
2. GLSim does NOT use those same downloaded runner artifacts. Per its own
   skill documentation ("GLSim ... runs Python natively, not in GenVM") and
   confirmed by inspecting the installed ``glsim`` package directly, it
   ships its own hand-written reimplementation in ``glsim/genvm_stubs.py``,
   which hardcodes ``__gl_allow_storage__ = True`` on exactly two of its own
   internal stub base classes rather than reproducing the real SDK's
   ``Contract.__init_subclass__`` -> ``generate_storage`` -> ``allow_storage``
   auto-registration chain for an arbitrary user-defined ``Contract``
   subclass. That is the exact and only reason this specific contract loads
   under the real pinned SDK (direct mode) but not under GLSim's stub.

Conclusion recorded here deliberately, not smoothed over: GLSim, like
genvm-lint (see docs/GENLAYER_CAPABILITY_MATRIX.md section 2), is a useful
fast local tool but is NOT a faithful oracle for this project's exact
pinned runner version. The contract was NOT changed to work around GLSim's
stub gap, because doing so would mean adding an annotation the real pinned
SDK does not require and has never asked for across 68 real-SDK-backed
tests -- that would be fitting the contract to a tool's bug instead of to
the runtime it is actually pinned against.

This leaves the originally-intended proof -- a real StudioNet or real
full-GenVM (``genlayer up``, Docker) deployment and transaction lifecycle --
genuinely unverified in this session. See docs/FINAL_HANDOFF.md for the
full blocker record and the exact next command for whoever has Studio/
Docker/an LLM provider key available.
"""

import json

import pytest
from gltest import get_contract_factory, get_accounts
from gltest.assertions import tx_execution_succeeded

POLICY_ID = "pt-int-1"
API_MODULE = "api-delivery"
API_VERSION = "1.0.0"
FAR_FUTURE_DEADLINE = "2999-01-01T00:00:00Z"

_GLSIM_STUB_BLOCKER = (
    "BLOCKED (diagnosed, not assumed): GLSim's own genvm_stubs.py reimplementation "
    "does not reproduce the real pinned SDK's Contract.__init_subclass__ -> "
    "generate_storage -> allow_storage auto-registration chain, so it rejects this "
    "(correctly-written, 68/68-passing-under-the-real-SDK) contract's storage class "
    "at deploy time with 'class is not marked for usage within storage'. Confirmed "
    "by reading both the real downloaded v0.2.16 SDK source (which auto-registers "
    "via __init_subclass__) and glsim/genvm_stubs.py (which hardcodes "
    "__gl_allow_storage__ on only two of its own internal stub classes). See the "
    "module docstring above and docs/FINAL_HANDOFF.md for the full investigation. "
    "This is a GLSim tooling gap, not a contract defect -- the contract was "
    "deliberately left unchanged rather than patched to fit a stub's bug."
)


@pytest.mark.slow
@pytest.mark.skip(reason=_GLSIM_STUB_BLOCKER)
def test_real_consensus_agreement_lifecycle_up_to_evidence_submission():
    accounts = get_accounts()
    admin = accounts[0]
    creator = accounts[1]
    counterparty = accounts[2]

    factory = get_contract_factory("AgentVerdictOS")
    contract = factory.deploy(args=[], account=admin)

    tx = contract.register_module(
        args=[API_MODULE, API_VERSION, json.dumps({"criteria": ["endpoint_coverage"]}), "repo,api"],
        account=admin,
    ).transact()
    assert tx_execution_succeeded(tx)

    tx = contract.register_policy_template(
        args=[POLICY_ID, "0xintegrationhash", 3600, "repo,api"],
        account=admin,
    ).transact()
    assert tx_execution_succeeded(tx)

    rubric = json.dumps({"criteria": [{"id": "endpoint_coverage", "description": "integration test criterion"}]})
    tx = contract.create_agreement(
        args=[counterparty.address, POLICY_ID, API_MODULE, 1000, FAR_FUTURE_DEADLINE, rubric],
        account=creator,
    ).transact()
    assert tx_execution_succeeded(tx)

    agreement_id = contract.get_protocol_stats(args=[]).call()["agreement_count"]
    agreement_id = "A-" + str(agreement_id)

    tx = contract.propose_agreement(args=[agreement_id], account=creator).transact()
    assert tx_execution_succeeded(tx)

    tx = contract.accept_agreement(args=[agreement_id], account=counterparty).transact()
    assert tx_execution_succeeded(tx)

    tx = contract.activate_agreement(args=[agreement_id], account=creator).transact()
    assert tx_execution_succeeded(tx)

    tx = contract.open_evidence(args=[agreement_id], account=creator).transact()
    assert tx_execution_succeeded(tx)

    tx = contract.submit_evidence(
        args=[agreement_id, "https://example.com/readme", "int-hash-1", "text/plain", "endpoint_coverage"],
        account=creator,
    ).transact()
    assert tx_execution_succeeded(tx)

    agreement = contract.get_agreement(args=[agreement_id]).call()
    assert agreement["state"] == "EVIDENCE_OPEN"

    evidence = contract.get_evidence_metadata(args=[agreement_id]).call()
    assert len(evidence["evidence"]) == 1


@pytest.mark.slow
@pytest.mark.skip(
    reason=(
        "BLOCKED: request_evaluation calls gl.nondet.exec_prompt inside the "
        "leader/validator closures (docs/EQUIVALENCE_MATRIX.md sections 2-3), which "
        "needs a live LLM provider key this agent does not have, in addition to the "
        "GLSim stub blocker above and the separate StudioNet signing-key boundary. "
        "See docs/FINAL_HANDOFF.md for the exact blocker and the manual next step "
        "for a developer with Studio/Docker/an LLM provider key."
    )
)
def test_real_consensus_evaluation_pass_decision():
    pass
