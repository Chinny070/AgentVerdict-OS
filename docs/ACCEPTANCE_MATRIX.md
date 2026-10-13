# Acceptance Matrix

Per spec section 5 "Shared acceptance" and brief section 11. Each row names the exact test that proves it, in `tests/direct/` unless marked integration-only (blocked this session — see `FINAL_HANDOFF.md`).

| Acceptance case | Covered by | Status |
|---|---|---|
| Happy path (propose → accept → activate → evidence → evaluate → PASS → challenge window elapses → finalize → authorize → settle) | `test_disputes.py::test_full_happy_path_pass_decision` (full lifecycle integration within direct mode, mocked LLM/web) | direct: implemented |
| Failed delivery (evaluation returns FAIL) | `test_api_delivery.py::test_fail_decision_blocks_settlement_authorization` | direct: implemented |
| Partial completion | `test_api_delivery.py::test_partial_decision_allows_authorize_settlement` | direct: implemented |
| Missing evidence | `test_api_delivery.py::test_no_evidence_blocks_request_evaluation` | direct: implemented |
| Malicious URL content (prompt injection payload) | `test_evidence.py::test_prompt_injection_payload_is_inert` | direct: implemented |
| Changing page (leader vs validator see different live content) | `test_api_delivery.py::test_validator_independent_refetch_can_disagree` | direct: implemented (simulated via differing mocks at leader vs validator time) |
| Contradictory evidence | `test_api_delivery.py::test_contradictory_evidence_downgrades_to_insufficient` | direct: implemented |
| Unreachable API | `test_api_delivery.py::test_unreachable_api_yields_insufficient_evidence_or_evaluation_error` | direct: implemented |
| Replayed packet | `test_evidence.py::test_rejects_duplicate_content_hash_same_agreement` | direct: implemented |
| Invalid rubric | `test_state_machine.py::test_create_agreement_rejects_empty_rubric` | direct: implemented |
| Conflicting policy (inactive / wrong revision) | `test_state_machine.py::test_create_agreement_rejects_inactive_policy` | direct: implemented |
| Appealed decision | `test_disputes.py::test_challenge_then_resolve_upheld_triggers_reevaluation`, `test_disputes.py::test_challenge_rejected_original_verdict_stands` | direct: implemented |
| Expired agreement | `test_state_machine.py::test_expire_agreement_after_deadline` | direct: implemented |
| Settlement double-spend prevention | `test_settlement.py::test_double_settlement_rejected` | direct: implemented |
| Validator equivalence on semantically similar but textually different explanations | `tests/integration/test_consensus_equivalence.py` | **integration-only, blocked** (no running GenVM node this session) |
| Live public web/API retrieval where network permits | `tests/integration/test_web_evidence.py` | **integration-only, blocked** |
| Real StudioNet deployment and schema reads/writes | `tests/integration/test_full_agent_lifecycle.py`, `deployments/studionet.json` | **blocked — no signing key access; see FINAL_HANDOFF.md** |
| Wallet interaction and transaction status transitions | frontend Stage 4 | **not started this session** |
| Accurate finality semantics in UI | frontend Stage 4 | **not started this session** |

Legend: "direct: implemented" means the test exists, was run, and passed in this session (see `TEST_EVIDENCE.md` for exact counts). "blocked" means the capability is designed and the contract-side logic exists, but the specific proof requires an environment this agent does not have in this session.
