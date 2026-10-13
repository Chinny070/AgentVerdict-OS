# Agreement State Machine

States are stored as a plain `str` on `Agreement.state` (storage rule: never persist a Python `Enum`, store `.value`-equivalent strings). This document is the from/action/actor/guard/to/invariant table the brief requires, and is the source of truth for `tests/direct/test_state_machine.py`.

## States

`DRAFT, PROPOSED, DECLINED, ACCEPTED, ACTIVE, EVIDENCE_OPEN, EVALUATING, PROVISIONAL, CHALLENGE_WINDOW, CHALLENGED, REEVALUATING, REMEDIATION_REQUESTED, PARTIAL, FINALIZED, SETTLED, TERMINATED, EXPIRED, CANCELLED_BY_RULE, EVALUATION_ERROR, SETTLEMENT_BLOCKED`

Simplification note (see `PROTOCOL_ARCHITECTURE.md` section 3): `EVALUATING`→`PROVISIONAL` happens inside one atomic `request_evaluation` transaction (GenVM transactions are atomic; there is no separate chain-visible "mid-evaluation" state to persist between two different transactions), so the contract writes `PROVISIONAL` directly and uses `EVALUATING` only as a transient in-memory label inside that call for clarity; `EVALUATION_ERROR` is the state actually persisted if the nondet evaluation raises.

## Transition table

| From | Action | Actor | Guards | To | Invariants / negative tests |
|---|---|---|---|---|---|
| (none) | `create_agreement` | creator (any registered or unregistered address — self-registers a passport on first use) | `counterparty != creator`; `amount_atto` is a non-negative `u256`; `policy_id` exists and `active`; `module_id` has at least one registered version | `DRAFT` | reject missing policy/module; reject zero-length rubric |
| `DRAFT` | `propose_agreement` | creator only | state is `DRAFT` | `PROPOSED` | freezes `policy_hash` (= stored `text_hash` of the policy at its current revision), `policy_revision`, `module_version` (= latest registered version at call time) onto the `Agreement` row — **never re-read live after this point**, satisfying "rubric frozen after acceptance, module version binding" |
| `PROPOSED` | `accept_agreement` | counterparty only | state is `PROPOSED`; `datetime.datetime.now(UTC)` before `deadline` | `ACCEPTED` | reject accept by creator or third party; reject after deadline (→ caller should call `expire_agreement` instead) |
| `PROPOSED` | `decline_agreement` | counterparty only | state is `PROPOSED` | `DECLINED` | terminal |
| `PROPOSED` | `expire_agreement` | anyone | state is `PROPOSED`; `datetime.datetime.now(UTC)` ≥ `deadline` | `EXPIRED` | terminal; prevents an unresponded proposal from ever being accepted after its own deadline |
| `ACCEPTED` | `activate_agreement` | creator or counterparty | state is `ACCEPTED` | `ACTIVE` | no value is accepted here — see "Settlement" in `PROTOCOL_ARCHITECTURE.md` |
| `ACTIVE` | `open_evidence` | creator or counterparty | state is `ACTIVE` | `EVIDENCE_OPEN` | |
| `EVIDENCE_OPEN` | `submit_evidence` | creator, counterparty, or an accepted non-revoked delegate of either, within spend/scope cap | state is `EVIDENCE_OPEN`; evidence firewall checks pass (see below) | `EVIDENCE_OPEN` (no state change) | reject if not `EVIDENCE_OPEN`; reject duplicate `content_hash` for the same agreement (replay); reject disallowed URL scheme/length; reject if evidence count for the agreement already at the bound (50) |
| `EVIDENCE_OPEN` | `request_evaluation` | creator or counterparty | state is `EVIDENCE_OPEN`; at least one evidence packet exists for the agreement | `PROVISIONAL` (or `EVALUATION_ERROR` on a classified nondet failure) | runs the bound module's leader/validator nondet evaluation (`EQUIVALENCE_MATRIX.md`); sets `Verdict.challenge_deadline = now + policy.challenge_window_seconds`; increments `attempt_no` |
| `PROVISIONAL` | *(automatic, recorded by the same call)* | — | — | `CHALLENGE_WINDOW` | the verdict is explicitly labeled non-final in every read method until `FINALIZED` — "never display a pending verdict as final" |
| `CHALLENGE_WINDOW` | `challenge_verdict` | creator, counterparty, or any address holding a non-revoked `AgentPassport` with standing on this agreement (V1 standing = creator/counterparty only — see `SECURITY_THREAT_MODEL.md` for the juror-expansion gap) | state is `CHALLENGE_WINDOW`; `datetime.datetime.now(UTC)` before `Verdict.challenge_deadline`; grounds string non-empty and bounded | `CHALLENGED` | reject a second simultaneous challenge on the same verdict attempt (idempotency: one open `Challenge` per `agreement_id` at a time) |
| `CHALLENGE_WINDOW` | `finalize_verdict` | anyone | state is `CHALLENGE_WINDOW`; `datetime.datetime.now(UTC)` ≥ `Verdict.challenge_deadline`; no open `Challenge` | `FINALIZED` | this is the only transition that may write a `ReputationEvent` or a `SettlementInstruction` — "no reputation update from provisional verdicts" |
| `CHALLENGED` | `resolve_challenge` | admin (interim arbiter — see honest limitation in `PROTOCOL_ARCHITECTURE.md` section 6) | state is `CHALLENGED`; challenge exists and is `OPEN` | `REEVALUATING` (if upheld) or `CHALLENGE_WINDOW` (if rejected, original verdict stands, new deadline set) | challenge record moves to `UPHELD`/`REJECTED`, never silently deleted |
| `REEVALUATING` | `request_evaluation` (re-invoked) | creator or counterparty | state is `REEVALUATING` | `PROVISIONAL` → `CHALLENGE_WINDOW` | `attempt_no` increments again; prior verdict kept at its historical key |
| `CHALLENGE_WINDOW`/`FINALIZED` | `request_rework` | creator or counterparty | latest verdict `decision` is `PARTIAL` or `FAIL` and `remedy` is `REWORK`; state is `CHALLENGE_WINDOW` or `FINALIZED` and not yet `SETTLED` | `REMEDIATION_REQUESTED` | |
| `REMEDIATION_REQUESTED` | `acknowledge_recovery` | creator or counterparty | state is `REMEDIATION_REQUESTED` | `EVIDENCE_OPEN` | re-opens the evidence window for a new attempt without creating a new `Agreement` row |
| `FINALIZED` | `authorize_settlement` | creator or counterparty | state is `FINALIZED`; verdict `decision` is `PASS` or `PARTIAL`; no `SettlementInstruction` already `AUTHORIZED`/`EXECUTED` for this agreement (idempotency/no-double-settlement) | `FINALIZED` (no state change; writes `SettlementInstruction.status = AUTHORIZED`) | reject if decision is `FAIL`/`INSUFFICIENT_EVIDENCE`/`ERROR` |
| `FINALIZED` | `record_settlement` | creator, counterparty, or admin | a `SettlementInstruction` exists with `status == AUTHORIZED` | `SETTLED` | flips `SettlementInstruction.status` to `EXECUTED` **before** any outbound transfer attempt (idempotency guard first); if `settlement_native_transfer_enabled` is `False`, this is a receipt-only no-op transfer, explicitly labeled as such; see `SECURITY_THREAT_MODEL.md` for the double-spend test |
| any non-terminal | `terminate_agreement` | admin only | latest verdict `remedy == ESCALATE`, or `attempt_no` has reached `MAX_ATTEMPTS` (3) | `TERMINATED` | terminal; no further evidence/evaluation/settlement calls accepted |
| `EVIDENCE_OPEN`/`ACTIVE`/`ACCEPTED` | `cancel_by_rule` | creator or counterparty | `datetime.datetime.now(UTC)` ≥ `deadline` and state is not already terminal/`FINALIZED`/`SETTLED` | `CANCELLED_BY_RULE` | terminal; distinct from `EXPIRED` (which only applies pre-acceptance) |

## Illegal-transition negative tests (enumerated for `tests/direct/test_state_machine.py`)

1. `accept_agreement` on a `DRAFT` agreement → reject.
2. `accept_agreement` called by the creator → reject (must be counterparty).
3. `submit_evidence` while state is `DRAFT`/`PROPOSED`/`ACCEPTED`/`ACTIVE` (before `open_evidence`) → reject.
4. `request_evaluation` with zero evidence packets → reject.
5. `challenge_verdict` after `challenge_deadline` has passed → reject.
6. `finalize_verdict` before `challenge_deadline` → reject.
7. `finalize_verdict` while a `Challenge` is still `OPEN` → reject.
8. `authorize_settlement` when decision is `FAIL` → reject.
9. `authorize_settlement` called twice for the same agreement → reject (no double-authorization).
10. `record_settlement` when no `SettlementInstruction` is `AUTHORIZED` → reject.
11. `record_settlement` called twice → second call rejects (status already `EXECUTED`, not `AUTHORIZED`) — this is the explicit double-settlement/idempotency test.
12. `resolve_challenge` by a non-admin → reject.
13. `register_module` by a non-admin → reject.
14. Any write method on a `TERMINATED`/`SETTLED`/`DECLINED`/`EXPIRED`/`CANCELLED_BY_RULE` agreement → reject (terminal states are immutable).
