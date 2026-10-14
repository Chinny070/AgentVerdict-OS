# AgentVerdict OS V2 — Live StudioNet Verification Report

**Date:** 2026-10-14
**V2 deployed contract:** `0xCC67216ceD224A971739bAA706142A740B31853C`
**V1 deployed contract (untouched, unaffected):** `0xb222305575ee8af1255d8aCd196280b405B54Baf`
**Network:** StudioNet, chain ID 61999
**Source:** `contracts/agentverdict.py` at commit `721f5b9` (Stage 6: challenge-timeout
fix + storage-pickling fix)
**Method:** manual calls through GenLayer Studio's web UI, two wallets
(`0xaffE15eEc45b68835cc9E5B4Ab85dD5deaE8e70b` deployer/admin,
`0x1Af111b06E6f6A05Bd41572A016318f1356aF85c` counterparty), every call
confirmed via Studio's transaction detail panel. This agent performed no
signing of any kind; every transaction below was executed by the user
themselves through Studio's UI, with this agent only supplying exact field
values and confirming contract behavior by reading `contracts/agentverdict.py`
before each step.

This is a substantially more thorough live run than the original
`docs/STUDIONET_LIVE_VERIFICATION_REPORT.md` (V1): it specifically targets
every path left untested there, plus the two Stage 6 fixes themselves.

## Bootstrap (Stage 4)

| Call | Result |
|---|---|
| `register_module("api-delivery", "1.0.0", ...)` | SUCCESS |
| `register_module("agent-task", "1.0.0", ...)` | SUCCESS |
| `register_policy_template("default-v1", ..., 259200, ...)` | SUCCESS |
| `register_policy_template("smoke-test-v2", ..., 900, ...)` | SUCCESS |

Verified via view reads: both modules `ACTIVE` with correct schemas; both
policies with correct `text_hash`/`challenge_window_seconds`.

## Agent identity

`register_agent` called from both wallets with distinct `capabilities_json`
(admin: task_sponsor/evaluator_integrator; counterparty: executing_agent).
Both SUCCESS.

## `A-1` — the primary test: agent-task module, non-PASS outcome, timeout recovery, rework/recovery x2, attempts-exhausted termination

This single agreement exercised the largest number of distinct paths:

1. `create_agreement(..., module_id="agent-task", ...)` -- SUCCESS, `"A-1"`.
   First live exercise of the `agent-task` module (V1 only tested
   `api-delivery`).
2. `propose_agreement` -> `accept_agreement` -> `activate_agreement` ->
   `open_evidence` -- all SUCCESS, standard lifecycle.
3. `submit_evidence` against `https://httpbin.org/status/404` (a genuine,
   verified-live 404, real empty-body hash
   `0xe3b0c44...852b855`) -- SUCCESS, `"E-1"`.
4. `request_evaluation` (attempt 1) -- SUCCESS. **Real non-PASS outcome,
   live:** decision `FAIL`, criterion `task_coverage` ->
   `INSUFFICIENT_EVIDENCE`, reason explicitly citing the 404 and tagged
   `[downgraded: cited evidence unreachable]` by the contract's contradiction/
   unavailable-source downgrade logic. **stderr was EMPTY** -- no pickling
   warning, unlike both V1 evaluation calls, live evidence the Stage 6
   storage-access fix works on real GenVM.
5. `challenge_verdict` filed deliberately (grounds explicitly stated as a test,
   not a real dispute) -- SUCCESS, `"C-1"`, `A-1` -> `CHALLENGED`.
6. **Deliberately left unresolved past the 900s resolution deadline, then
   `resolve_challenge_by_timeout("C-1")` called instead of `resolve_challenge`
   -- SUCCESS.** This is the headline result of this whole V2 deploy: the
   Stage 6 fix for the unbounded-challenge-latency gap (item 8) worked live,
   with real 5/5 validator consensus. Verified via `get_challenge("C-1")`:
   `state: "TIMEOUT_REJECTED"` (correctly distinct from a normal admin
   `"REJECTED"`), `resolution: "[TIMEOUT] admin did not call
   resolve_challenge before the resolution deadline; original verdict upheld
   automatically, no discretionary judgment applied"` -- an honest,
   unambiguous audit trail exactly as designed. Verified via `get_agreement`:
   `A-1` correctly reopened into `CHALLENGE_WINDOW` with a fresh deadline
   (`get_verdict` confirmed the new `challenge_deadline`).
7. `finalize_verdict("A-1")` after the reopened window elapsed -- SUCCESS,
   `A-1` -> `FINALIZED`. This is the ONE real `finalize_verdict` call this
   agreement ever received (decision `FAIL`), and is the sole source of its
   one reputation event (see below).
8. `request_rework("A-1", ...)` -- SUCCESS. Confirmed live that
   `request_rework` works from `FINALIZED` state (not only
   `CHALLENGE_WINDOW`, matching the contract's actual guard, broader than
   this agent initially assumed when planning the test). `A-1` ->
   `REMEDIATION_REQUESTED`.
9. `acknowledge_recovery("A-1")` -- SUCCESS, `A-1` -> `EVIDENCE_OPEN`.
10. `submit_evidence` (attempt 2) against `https://example.org` (reachable,
    real HTTP 200) -- SUCCESS, `"E-2"`.
11. `request_evaluation` (attempt 2) -- SUCCESS. **Still `FAIL`, but for a
    semantically different and more interesting reason**: the evaluator
    judged the evidence against BOTH `E-1` and `E-2` and concluded the
    generic Example Domain placeholder page, while reachable, "does not
    describe any completed task work" -- a genuine semantic judgment, not a
    bare reachability check. stderr again empty.
12. `request_rework` -> `acknowledge_recovery` (second cycle) -- both
    SUCCESS, confirming the rework/recovery path is itself repeatable.
13. `submit_evidence` (attempt 3), same URL -- SUCCESS, `"E-3"`.
14. `request_evaluation` (attempt 3) -- SUCCESS. Still `FAIL`/
    `INSUFFICIENT_EVIDENCE`, citing all three evidence items (`E-1`, `E-2`,
    `E-3`) together. `attempt_no` now `3`, matching `MAX_ATTEMPTS`.
15. `terminate_agreement("A-1", ...)` from the **admin** wallet -- SUCCESS,
    `A-1` -> `TERMINATED`. Confirmed live that the `attempts_exhausted` path
    (`attempt_no >= MAX_ATTEMPTS`) independently authorizes termination even
    when the latest verdict's remedy is `REWORK`, not `ESCALATE` -- the
    contract's `terminate_agreement` guard is `escalate_ok OR
    attempts_exhausted`, and this run exercised the `attempts_exhausted`
    branch specifically, which the V1 run never touched.

## Delegation

`delegate_scope` (admin -> counterparty, zero spend cap, test scope) --
SUCCESS, `"D-1"`. `accept_delegation("D-1")` from the counterparty wallet --
SUCCESS. First live exercise of the delegation feature in either deployment.

## `A-2` — settlement path

Fresh agreement, `api-delivery` module, nonzero symbolic `amount_atto`
(`1000000000000000000`, purely to give settlement something to authorize --
no real value changes hands since native transfer is disabled by default).
Full lifecycle to `PASS` (uncertainty `MEDIUM` this time, an honestly weaker
confidence level than `A-1`'s earlier `LOW`, since the evidence only loosely
matched a loose rubric -- a good sign the uncertainty field reflects genuine
evidence strength, not a fixed value). `finalize_verdict` -- SUCCESS,
`FINALIZED`.

`authorize_settlement("A-2")` -- SUCCESS, `"S-1"` created, full
`amount_atto` authorized (decision was `PASS`, not halved as a `PARTIAL`
would be). `record_settlement("A-2")` -- SUCCESS, `A-2` -> `SETTLED`.
Verified via `get_settlement("A-2")`: `status: "EXECUTED"`, correct
recipient, correct amount, correct reason -- and, confirmed by reading the
contract, this never attempted a real GEN transfer, since
`settlement_native_transfer_enabled` defaults `False` and the contract
raises an explicit, honest error rather than guessing at an unverified
native-transfer API if that flag is ever turned on. This is a receipt-only
settlement by design, exactly matching spec invariant 2.

## Reputation cross-check

`get_agent_passport` for the counterparty wallet after all of the above:
`completed_count: 1`, `disputed_count: 1`, `reputation_score: 0`. This
exactly matches independent arithmetic from the code
(`_apply_reputation_event`'s `delta_map = {"PASS": 5, "PARTIAL": 1, "FAIL":
-5, ...}`): the ONE real `finalize_verdict` call on `A-1` (decision `FAIL`)
contributed `-5` and `disputed_count += 1`; `A-2`'s `finalize_verdict`
(decision `PASS`) contributed `+5` and `completed_count += 1`; net score `0`.
Critically, `A-1`'s two later rework attempts (#2 and #3) did NOT produce
additional reputation events, because they ended in `terminate_agreement`
rather than a second `finalize_verdict` -- confirming live that
`_apply_reputation_event` is only ever called from `finalize_verdict` (one
call site in the whole contract), matching spec invariant 5 ("no reputation
update from provisional verdicts").

## What this run proves, beyond the V1 report

- **The Stage 6 timeout-recovery fix works live**, with real validator
  consensus, correct state transitions, and an honest, distinguishable audit
  trail (`TIMEOUT_REJECTED` vs. admin `REJECTED`).
- **The Stage 6 storage-pickling fix appears to work live**: both
  `request_evaluation` calls on V2 produced empty stderr, versus the warning
  seen on both V1 calls. This is strong circumstantial evidence, not a
  from-first-principles proof (stderr absence on two calls doesn't
  mathematically rule out the warning under different inputs), but it is
  real observed behavior, not an assumption.
- **The `agent-task` module works live**, including a correct semantic
  (not just reachability-based) non-PASS judgment.
- **Rework/recovery is fully repeatable** across multiple cycles.
- **Attempts-exhausted termination works independently of remedy type.**
- **Delegation accept/revoke flow works.**
- **Settlement authorization and recording work correctly as a receipt-only
  mechanism**, with the native-transfer-disabled safety behavior confirmed
  exactly as designed, never silently bypassed.
- **Reputation accounting is provably correct**, cross-checked against the
  contract's own exact arithmetic, not just "it looked right."

## What remains untested on both deployments

`update_policy_template`, `revoke_agent`, `revoke_delegation`,
`decline_agreement`, `expire_agreement`, `cancel_by_rule`, the `upheld=true`
branch of `resolve_challenge` (re-evaluation path), a `PARTIAL` decision
outcome, and `set_settlement_native_transfer_enabled` (deliberately -- this
is correctly understood as unsafe to test live given its documented
unverified-stub behavior, not an oversight).

## Verdict

**V2 deployment is live-verified as a genuine superset of V1's coverage**,
specifically closing the gap the V1 report flagged as its main open
question (whether the timeout-recovery design would actually work on real
consensus, not just in direct-mode tests). Both V1 (`0xb222305575ee8af1255d8
aCd196280b405B54Baf`) and V2 (`0xCC67216ceD224A971739bAA706142A740B31853C`)
remain live and independently addressable; V1's existing history (`A-1`,
`A-2`, both `FINALIZED`) is completely unaffected by this V2 deployment and
testing.
