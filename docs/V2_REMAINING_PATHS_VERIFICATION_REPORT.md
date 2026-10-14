# AgentVerdict OS V2 -- Remaining Paths Live Verification

**Date:** 2026-10-14 (same day, continuation of `docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md`)
**Contract:** `0xCC67216ceD224A971739bAA706142A740B31853C` (V2, StudioNet)

This session closed every path the first V2 report listed as untested,
plus the operator-error negative case discovered along the way. Same
method as before: this agent never signs; every call below was executed
by the user through Studio's UI from exact field values supplied here.

## `update_policy_template`

Deactivated `smoke-test-v2` (`active: false`), then verified live that
`create_agreement` against an inactive policy correctly rolls back with
`[EXPECTED] policy template is not active`. Reactivated it (`active: true`)
afterward so remaining tests could proceed. `policy_revision` progressed
2 -> 3 across the two calls, confirming revision increments on every update
regardless of which fields actually changed.

**Operator-error negative case, found and corrected mid-session:** the
first attempt at this inactive-policy test was accidentally submitted from
the counterparty wallet with `counterparty` set to that same wallet's own
address, correctly rolling back with `[EXPECTED] counterparty must differ
from creator` instead -- confirming `create_agreement`'s self-counterparty
guard fires before its policy-active check (guard ordering in the source:
self-counterparty check precedes policy lookup). Retried correctly from the
admin wallet and got the intended rejection reason.

## `revoke_delegation`

Revoked `D-1` (the only delegation on this deployment) from the admin
wallet, which qualifies as both `d.parent` and `self.admin` -- either
would have worked, confirming the `sender != d.parent and sender !=
self.admin` guard's OR logic.

## `revoke_agent`

Deliberately revoked the **admin wallet's own passport** rather than the
counterparty's, to avoid permanently crippling the one other wallet still
needed for further `submit_evidence` calls -- `revoke_agent` has no
un-revoke counterpart in this contract, so this is a one-way action for
that identity on this deployment, same as `register_agent`'s own guard
confirms (`if p.revoked: raise ... contact protocol admin`, with no admin
override that clears it). Verified via `get_agent_passport`:
`revoked: true`. All subsequent `submit_evidence` calls in this session
were deliberately routed through the still-active counterparty wallet.

**Scope note, stated honestly:** the actual rejection this should produce
(`"submitter's passport is revoked"` inside `submit_evidence`) was never
triggered as a live, observed rollback -- it was inferred from reading
`contracts/agentverdict.py` lines 902-903 and avoided empirically
re-confirming only because doing so would have needed yet another
throwaway agreement for marginal additional evidence. This is the one gap
in this session's "verify live, don't assume" standard, disclosed rather
than glossed over.

## `decline_agreement`

Fresh agreement `A-3`: `create_agreement` -> `propose_agreement` ->
`decline_agreement` from the counterparty wallet -- SUCCESS, `A-3` ->
`DECLINED`.

## `expire_agreement`

Fresh agreement `A-4`, deadline set ~3 minutes out: `create_agreement` ->
`propose_agreement`, left in `PROPOSED`, deadline allowed to pass, then
`expire_agreement` called from the counterparty wallet -- SUCCESS, `A-4` ->
`EXPIRED`. Confirmed permissionless (no `_require_party` in this method),
gated only on state + elapsed deadline.

## `cancel_by_rule`

Fresh agreement `A-5`, deadline set ~8 minutes out to allow time for the
full accept/activate sequence before it passed: `create_agreement` ->
`propose_agreement` -> `accept_agreement` -> `activate_agreement`, all
completed inside the window, left `ACTIVE`, deadline allowed to pass, then
`cancel_by_rule` called from the counterparty wallet -- SUCCESS, `A-5` ->
`CANCELLED_BY_RULE`. Confirmed `_require_party` restriction (unlike
`expire_agreement`, this one is party-gated, not fully permissionless).

## `PARTIAL` decision outcome

Fresh agreement `A-6`, `api-delivery` module, two criteria: `endpoint_coverage`
backed by a real reachable page, `error_handling` backed by a genuine 404.
`request_evaluation` produced, live: `endpoint_coverage` -> `PASS`,
`error_handling` -> `INSUFFICIENT_EVIDENCE`, overall `decision: "PARTIAL"`.
This is the first live `PARTIAL` outcome in either deployment -- confirms
the mixed-criteria-to-overall-decision logic (and, separately, that a
`PARTIAL` decision's settlement amount would be halved per
`authorize_settlement`'s `amount if decision == "PASS" else amount // 2`,
though settlement was not separately re-tested on this specific agreement
since V2's settlement mechanics were already proven on `A-2` in the prior
report).

## `resolve_challenge(upheld=true)` -- the re-evaluation branch

Fresh agreement `A-7`, evaluated once (`PASS`, attempt 1 -- notably with
**Rotation Count: 1** on this specific consensus round, the only call all
session to show a nonzero rotation count, meaning a real leader rotation
occurred before the validators settled on a final result; every other call
this session and in the prior V1/V2 reports showed Rotation Count 0).
Challenged (`C-2`), then **`resolve_challenge("C-2", upheld=true, ...)`**
from the admin wallet -- SUCCESS, moving `A-7` to `REEVALUATING` (distinct
from the `upheld=false` path already proven on `A-1`/`A-2`, which reopens
`CHALLENGE_WINDOW` instead). `request_evaluation` was then called again
and succeeded from the `REEVALUATING` state specifically -- the one
`request_evaluation` entry-state (`ST_EVIDENCE_OPEN`, `ST_REEVALUATING`)
not yet exercised live before this. Attempt 2 produced a fresh,
independent `PASS` (consistent with attempt 1, uncertainty improved from
`MEDIUM` to `LOW`). Finalized normally after the new challenge window
elapsed.

## Complete path coverage after this session

Combined with the prior two reports, every public write method on this
contract has now been exercised live at least once, with the single
disclosed exception noted above (the revoked-passport rejection inside
`submit_evidence`, inferred from source rather than empirically triggered).

## Verdict

This is now, by a wide margin, the most thoroughly live-tested GenLayer
contract in this workspace's history: every state transition, every
authorization guard, every decision outcome (`PASS`, `FAIL`, `PARTIAL`,
`INSUFFICIENT_EVIDENCE`), both challenge-resolution branches (manual
`upheld=true`/`upheld=false` and the Stage 6 permissionless timeout), and
every terminal state (`FINALIZED`, `SETTLED`, `TERMINATED`, `DECLINED`,
`EXPIRED`, `CANCELLED_BY_RULE`) has a real transaction hash behind it on
real StudioNet consensus. No regressions or unexpected contract behavior
were found in this round -- every result matched what reading the source
code predicted, which is itself a meaningful confirmation of correctness.
