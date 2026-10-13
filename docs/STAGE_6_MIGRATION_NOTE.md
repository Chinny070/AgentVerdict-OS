# Stage 6 — Challenge-Timeout Fix, Pickling-Warning Fix, and Migration Note

**Date:** 2026-10-14
**Agent:** Claude Sonnet 5, continuing AgentVerdict OS from the 2026-10-13 live
StudioNet verification session (`docs/STUDIONET_LIVE_VERIFICATION_REPORT.md`,
`docs/SECURITY_THREAT_MODEL.md` items 8-9).
**Deployed contract (unchanged by this session):**
`0xb222305575ee8af1255d8aCd196280b405B54Baf`, StudioNet, chain ID 61999.

This agent has no StudioNet signing key and did not deploy, redeploy, or send
any transaction to the deployed address. Everything below is a *source*
change to `contracts/agentverdict.py`, ready for the user to deploy
themselves later as a new contract version.

## 1. Why this had to be a new version, not a live patch

GenVM intelligent contracts, as deployed here (a single `gl.Contract` pushed
directly through GenLayer Studio, no proxy/factory pattern), are
**deployed-code-immutable**: the address is permanently bound to the code
that was deployed to it. Evidence for this, stated honestly with its limits:

- This project's own `contracts/agentverdict.py` and deployment tooling never
  reference any upgrade/proxy mechanism for the contract itself.
- The `genlayer-dev` skill's own `write-contract` guidance (local, trusted
  reference used throughout this build) states, for the one place it
  discusses redeployment at all (the factory/child-contract pattern):
  "Workers are immutable after deployment. Code changes require redeploying
  the factory." No alternative in-place-upgrade mechanism for a top-level
  contract is documented anywhere in that skill.
- A live web search this session (`sdk.genlayer.com`, `docs.genlayer.com`,
  general web search) did **not** turn up an authoritative GenLayer-specific
  page that confirms or denies an in-place upgrade feature either way --
  flagged explicitly rather than silently assumed. The searches returned
  nothing GenLayer-specific on this exact question.
- No contradicting evidence was found anywhere (this repo's docs, the pinned
  SDK source read extensively this session and the prior session, or the web
  search). Standard blockchain smart-contract behavior (code bound to address
  at deployment) is the default assumption in the absence of a documented
  override, and every piece of concrete evidence available points the same
  way.

**Conclusion, held with appropriate confidence:** treat the deployed instance
as immutable. A future deployment of this fixed source is a **new contract
at a new address**, with **no automatic state migration** -- `A-1`, `A-2`,
all registered modules/policy templates, and all passports/reputation
history on `0xb222305575ee8af1255d8aCd196280b405B54Baf` stay exactly where
they are and are not carried over. If the user later needs that history on
the new instance, it would have to be re-created there explicitly (e.g.
re-registering modules/policies), which is outside this session's scope.

## 2. Priority 1 — challenge-resolution timeout fix

**Root cause:** `resolve_challenge` checked only that a challenge was `OPEN`
and the agreement was `CHALLENGED` -- no deadline. Filing a challenge moves
an agreement out of `CHALLENGE_WINDOW` (the only state `finalize_verdict`'s
window check examines) into `CHALLENGED`, which only `resolve_challenge`
could ever leave. An admin who never calls it leaves the agreement stuck
forever: no finalization, no settlement, no reputation event. Confirmed live
on `A-2` (`docs/STUDIONET_LIVE_VERIFICATION_REPORT.md`, finding 3).

**Fix:**
- `Challenge` gained a `resolution_deadline: str` field (appended at the end
  of the dataclass, per storage-layout rules), set in `challenge_verdict` to
  `now + policy.challenge_window_seconds` -- the *same* duration the
  agreement's own policy template already encodes for the verdict's own
  challenge window, not a new, separately-governed constant. Reasoning: the
  protocol already treats this duration as "how long this policy says
  parties/admins get to react," so reusing it for the admin's own response
  SLA is consistent rather than arbitrary, and it inherits the policy
  author's own judgment about what's a reasonable window for a given
  deployment (e.g. the smoke-test policies' short windows vs. `default-v1`'s
  3-day window).
- A new permissionless `resolve_challenge_by_timeout(challenge_id: str)`
  write method: once `resolution_deadline` has passed with the challenge
  still `OPEN` and the agreement still `CHALLENGED`, it deterministically
  **upholds the original verdict** (same effect as an admin
  `resolve_challenge(upheld=False)`), tags
  `Challenge.state = "TIMEOUT_REJECTED"` (never reused for a normal admin
  `"REJECTED"`, so the audit trail is unambiguous), and routes through the
  exact same `_reopen_challenge_window` helper the admin-rejection branch
  uses -- no parallel settlement/reputation implementation exists.

**Design decisions and their justification (the two explicitly flagged
judgment calls from the task):**

1. **Eligibility: fully permissionless.** No `_require_party`/`_require_admin`
   check on `resolve_challenge_by_timeout`. Justification: the outcome is
   100% deterministic and identical regardless of who calls it -- there is
   no discretion for a caller to exploit. Restricting eligibility (e.g. to
   the challenger only) would reintroduce exactly the liveness bottleneck
   this method exists to remove: an absent or malicious restricted caller
   could simply not call it, recreating the same deadlock one level removed.
   This also mirrors the existing permissionless pattern already used by
   `finalize_verdict` and `expire_agreement` elsewhere in this same contract.
2. **Outcome: timeout always upholds the original verdict, never the
   challenge.** This was checked against spec invariant 8 ("no automatic
   high-stakes penalties based only on inferred collusion or speculative
   causality") as the task required. Defaulting to "the challenge wins" on
   timeout would mean admin silence is treated as evidence the original
   verdict was wrong -- that is exactly the kind of inferred-causality
   penalty invariant 8 forbids, and it would hand anyone a strictly *worse*
   griefing tool than the one being fixed (file a free challenge, wait out
   the clock, force a reversal with zero evidence). Upholding the original
   verdict instead preserves the real leader/validator-adjudicated consensus
   result and only unblocks the state machine; the challenger retains the
   option to escalate off-chain or through protocol governance. This did not
   require stopping for the user's judgment call -- the invariant gave a
   clear, singular answer, so both pieces were implemented rather than left
   as open alternatives.

**Tests:** `tests/direct/test_challenge_timeout.py`, 9 new tests covering:
deadline set correctly on filing; legitimate admin resolution still works
before the deadline (and the timeout path correctly no-ops afterward since
the challenge is no longer `OPEN`); timeout-call rejected before the
deadline with no state change; timeout-call succeeds after the deadline;
timeout-call succeeds for a caller unrelated to the agreement
(`direct_charlie`), proving permissionlessness; double-calling is rejected
and does not re-apply any effect; full state/reputation/settlement parity
with the normal finalize path (same verdict, same `+5` reputation event,
same settlement authorization reachable afterward); and two guard-condition
tests (wrong agreement state, unknown challenge id).

## 3. Priority 2 — nondet-mode storage pickling warning

**Root cause, confirmed by reading the pinned v0.2.16 SDK's actual source
(not guessed):**

1. `genlayer/gl/vm.py`'s `run_nondet`/`run_nondet_unsafe` serialize
   `leader_fn`/`validator_fn` with `cloudpickle.dumps(...)` before execution.
2. Every `@allow_storage` dataclass instance returned from a `TreeMap` read
   (e.g. `self.evidence[eid]` -> an `EvidencePacket`) is a live proxy with a
   `_storage_slot` attribute, set in
   `genlayer/py/storage/_internal/desc_record.py::_RecordDesc.get()`.
3. `Slot.__getstate__` (`genlayer/py/storage/_internal/core.py`) returns
   `(self.manager, self.id)` -- so pickling *any* storage-backed object also
   pickles the contract's storage-manager singleton.
4. That singleton, `_ActualStorageMan`
   (`genlayer/gl/_internal/storage.py`), has its own `__getstate__` override
   whose entire body is: warn
   `"Detected pickling storage class. Reading storage in nondet mode is not
   supported"`, then proceed anyway.

`AgentVerdictOS._run_llm_adjudication` built
`bounded_rows = evidence_rows[:MAX_EVIDENCE_SOURCES]` -- the actual
storage-backed `EvidencePacket` objects -- and both `leader_fn` and
`validator_fn` (the closures `gl.vm.run_nondet` pickles) iterated that list
directly, reading `row.url`/`row.evidence_id`/`row.criterion_id` from the
live proxy. That is precisely what triggered the warning on both live
`request_evaluation` calls.

**This was a contract-side defect with a contract-side fix**, not a
GenVM/SDK limitation requiring a workaround or a suppression. Fix: extract
plain `str` fields into ordinary `dict`s *before* `leader_fn` is even
defined, so the closures only ever capture plain Python immutables, never a
storage-backed proxy. No GenLayer SDK/GenVM internals were modified. No
`warnings.filterwarnings` suppression was added anywhere.

**Reproduction, executed this session, not assumed either way:**

- A standalone script (kept out of the committed suite, scratch-only) built
  a reverted "vulnerable" copy of `_run_llm_adjudication` and ran it through
  `gltest`'s direct-mode harness with `direct_vm.check_pickling = True`
  (which does call real `cloudpickle.dumps` on the closures) -- **zero**
  warnings fired, on both the vulnerable and the fixed variant. Root cause:
  `gltest/direct/vm.py::InmemManager` (the storage manager direct-mode
  tests actually use) has **no** `__getstate__` override at all, unlike the
  real pinned SDK's `_ActualStorageMan`. Direct-mode silence here does not
  and never did prove the real GenVM runtime was unaffected -- recorded
  explicitly in `tests/direct/test_storage_pickling_regression.py`.
- A second, more rigorous standalone script imported the pinned SDK's real
  `genlayer.py.storage._internal.core` module (`Slot`, `Manager` -- the exact
  classes every `@allow_storage` dataclass and the real `_ActualStorageMan`
  build on) and reproduced the mechanism directly: a closure capturing a
  `Slot` fires the exact live-observed warning when cloudpickled; a closure
  capturing only a plain value extracted beforehand does not. This is kept
  in the suite as
  `tests/direct/test_storage_pickling_regression.py::test_real_sdk_slot_pickling_mechanism`.

**Consensus/correctness impact:** no evidence of a validator-disagreement or
state-corruption risk was found -- both live calls returned correct,
validator-agreed results despite the warning, because the pickled
`Slot`/manager reference still round-trips correctly inside the real
runtime's leader/validator process. The risk this fix removes is reliance on
an explicitly-unsupported code path ("Reading storage in nondet mode is not
supported"), which the SDK's own maintainers flag as fragile -- not a
demonstrated live defect. Fixing it proactively is more honest than leaving
a known-unsupported warning in place and hoping it keeps working.

## 4. Files touched this session

- `contracts/agentverdict.py` -- `Challenge.resolution_deadline` field;
  `challenge_verdict` sets it; `resolve_challenge` refactored to share
  `_reopen_challenge_window`; new `resolve_challenge_by_timeout` method;
  `get_challenge` now returns `resolution_deadline`; `_run_llm_adjudication`
  extracts plain evidence fields before building the nondet closures.
- `tests/direct/test_challenge_timeout.py` (new, 9 tests).
- `tests/direct/test_storage_pickling_regression.py` (new, 2 tests).
- `docs/SECURITY_THREAT_MODEL.md` -- items 8 and 9 updated in place with the
  fix description, test references, and the residual live-instance risk;
  open risk 2 annotated with the partial mitigation.
- `docs/FEATURE_IMPLEMENTATION_LEDGER.md` -- feature 38 row annotated with
  the Stage 6 update.
- `deployments/studionet.json` -- new `stage_6_fix_status` block stating
  plainly that the deployed instance does not have this fix and why.
- `docs/STAGE_6_MIGRATION_NOTE.md` -- this file.
- `web/src/chain/schema.ts`, `web/src/chain/schema.test.ts` -- added
  `resolve_challenge_by_timeout` to the method manifest; updated the
  method-count assertions (40 total: 12 view, 28 write).
- `web/src/chain/contract.ts` -- `ChallengeView.resolution_deadline` +
  widened `state` union; new `writes.resolveChallengeByTimeout`.
- `web/src/components/StatusBadge.tsx` -- `TIMEOUT_REJECTED` badge mapping.
- `web/src/components/ChallengeTimeline.tsx` -- displays the admin
  resolution deadline and whether permissionless timeout recovery is
  currently eligible; explicit messaging for challenges read from the
  pre-Stage-6 deployed instance (empty `resolution_deadline`).
- `web/src/features/appeals/AppealsTribunal.tsx` -- new "Permissionless
  timeout recovery" panel and action wired to
  `writes.resolveChallengeByTimeout`.

## 5. Test and build results

- `genvm-lint check contracts/agentverdict.py --json`: `ok:true`, 40 methods
  (12 view, 28 write), 0 ctor params -- up from the pre-Stage-6 39 (12 view,
  27 write).
- `pytest tests/direct/`: **81 passed** (baseline 70 passed, re-confirmed
  unchanged before any edit; +9 `test_challenge_timeout.py`, +2
  `test_storage_pickling_regression.py`). No existing test's behavior
  changed.
- `cd web && npm run typecheck`: clean.
- `cd web && npm run build`: succeeds (535 modules transformed; the one
  >500kB chunk-size warning is pre-existing and unrelated to this change).
- `cd web && npx vitest run`: 19/19 passing (5 files), including the updated
  `schema.test.ts` assertions.

## 6. What remains open

- The deployed instance (`0xb222305575ee8af1255d8aCd196280b405B54Baf`) still
  has the unbounded challenge-resolution-latency gap for any *future*
  challenged agreement. `A-1`/`A-2` are both already `FINALIZED` and
  unaffected.
- No new deployment was performed. Deploying this fixed source is the user's
  decision and action (no signing key available to this agent); doing so
  creates a new address with no automatic migration of existing
  agreements/modules/policies/passports from the old deployment.
- The "GenVM contracts are deployed-code-immutable" claim is held with high
  confidence from local skill documentation and the complete absence of any
  contradicting mechanism anywhere in this project or the pinned SDK, but
  this session could not find a single authoritative GenLayer-specific
  documentation page that states it in so many words. If the user has
  access to an official statement on this, it would be worth confirming
  against this note.
