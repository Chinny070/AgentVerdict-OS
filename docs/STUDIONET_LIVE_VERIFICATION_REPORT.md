# AgentVerdict OS — Live StudioNet Verification Report

**Date:** 2026-10-13
**Deployed contract:** `0xb222305575ee8af1255d8aCd196280b405B54Baf`
**Network:** StudioNet, chain ID 61999
**Method:** manual calls through GenLayer Studio's web UI, two wallets
(`0xaffE15eEc45b68835cc9E5B4Ab85dD5deaE8e70b` deployer/admin,
`0x1Af111b06E6f6A05Bd41572A016318f1356aF85c` counterparty), every call
confirmed via Studio's transaction detail panel before proceeding to the
next step. No mocks, no simulator -- this is the first real-network exercise
of the deployed contract after the Stage 0-4 build and the pre-deployment
audit (commit `ea4ccce`).

This report records what was *observed*, not what was expected. Any
surprise is called out explicitly rather than smoothed over.

## Bootstrap

| Call | Result |
|---|---|
| `register_module("api-delivery", "1.0.0", ...)` | SUCCESS, 5/5 validators |
| `register_module("agent-task", "1.0.0", ...)` | SUCCESS, 5/5 validators |
| `register_policy_template("smoke-test-v1", ..., 120, ...)` | SUCCESS |
| `register_policy_template("default-v1", ..., 259200, ...)` | SUCCESS |
| `register_policy_template("smoke-test-v2", ..., 900, ...)` | SUCCESS (added after v1's 120s window proved too short for manual testing, see below) |

Policy texts and their hashes are committed at `docs/POLICY_TEMPLATE_DEFAULT_V1.md`,
`docs/POLICY_TEMPLATE_SMOKE_TEST_V1.md`, `docs/POLICY_TEMPLATE_SMOKE_TEST_V2.md`.

## Run 1 — `A-1`, happy path, policy `smoke-test-v1`

| Step | Tx hash (short) | Result |
|---|---|---|
| `create_agreement` | `0x47a397d6...` | SUCCESS, returned `"A-1"` |
| `propose_agreement("A-1")` | `0xb5c84095...` | SUCCESS (see finding 1 below -- this step was initially missed) |
| `accept_agreement("A-1")` (counterparty wallet) | `0x3fb2146a...` | SUCCESS |
| `activate_agreement("A-1")` | `0x8ac19b4b...` | SUCCESS |
| `open_evidence("A-1")` | `0x3ee5efd5...` | SUCCESS |
| `submit_evidence` (criterion `endpoint_coverage`, real sha256 of fetched `https://example.org`) | `0x867aadf9...` | SUCCESS, evidence `E-1` |
| `submit_evidence` (criterion `documentation`, distinct real hash) | `0xc0e480ae...` | SUCCESS, evidence `E-2` |
| `request_evaluation("A-1")` | `0x27d4dc7e...` | SUCCESS, real leader+validator consensus (5/5), live `gl.nondet.web.get` fetch, decision **PASS** both criteria, uncertainty **LOW** |
| `challenge_verdict("A-1", ...)` attempted after the 120s window had already elapsed | `0x1b191eb2...` | ROLLBACK, `[EXPECTED] challenge window has closed` -- correct, expected behavior given elapsed real time, not a bug |
| `finalize_verdict("A-1")` | `0xac58dd89...` | SUCCESS, `A-1` -> FINALIZED, reputation event recorded for counterparty |

## Run 2 — `A-2`, challenge path, policy `smoke-test-v2` (900s window)

| Step | Tx hash (short) | Result |
|---|---|---|
| `create_agreement` | `0xce7e941c...` | SUCCESS, returned `"A-2"` |
| `propose_agreement("A-2")` | `0xbf391fcc...` | SUCCESS |
| `accept_agreement("A-2")` | `0xe150a2fd...` | SUCCESS |
| `activate_agreement("A-2")` | `0x37633f2e...` | SUCCESS |
| `open_evidence("A-2")` | `0x6c7047b7...` | SUCCESS |
| `submit_evidence` (criterion `endpoint_coverage`) | `0x8510851d...` | SUCCESS, evidence `E-3` |
| `request_evaluation("A-2")` | `0xe1a9822c...` | SUCCESS, real consensus, decision **PASS**, uncertainty **LOW** -- window opened here |
| `challenge_verdict("A-2", ...)` (deliberately weak grounds, filed ~2m12s after the window opened) | `0xfc310085...` | SUCCESS, challenge `C-1` filed, `A-2` -> CHALLENGED |
| `resolve_challenge("C-1", upheld=false, ...)` (admin wallet) | `0xab876168...` | SUCCESS, `C-1` -> REJECTED, `A-2` -> CHALLENGE_WINDOW with a fresh deadline |
| `finalize_verdict("A-2")` (after the reset window elapsed, ~3h22m later due to an unrelated network interruption) | `0xbf4c7627...` | SUCCESS, `A-2` -> FINALIZED |

## Findings

1. **Operator error, not a contract defect:** `create_agreement` returns an
   agreement in `DRAFT`, not `PROPOSED`. The first `accept_agreement` attempt
   on `A-1` correctly rolled back with `[EXPECTED] agreement is not in
   PROPOSED state` because `propose_agreement` had not yet been called. This
   is the contract's state machine working as designed -- the build brief's
   `DRAFT -> PROPOSED -> ACCEPTED` sequence requires an explicit creator
   action between creation and counterparty acceptance. Corrected by calling
   `propose_agreement` before retrying. No code change needed.

2. **`smoke-test-v1`'s 120-second challenge window was too short for manual,
   human-paced testing** through a chat-mediated Studio UI workflow -- the
   first `challenge_verdict` attempt on `A-1` closed before it could be
   filed. This is not a contract bug (the window closing is exactly correct,
   deterministic behavior); it is purely a test-design mismatch between an
   automated-script pace and a manual click-and-confirm pace. Fixed by
   registering `smoke-test-v2` with a 900-second window for the second run,
   which was comfortably sufficient.

3. **`resolve_challenge` has no deadline check at all** (confirmed by reading
   `contracts/agentverdict.py` lines 1206-1232) -- it only validates
   `challenge_id` exists, the challenge is `OPEN`, and the agreement is
   `CHALLENGED`. This matters in practice: an open challenge can sit
   unresolved indefinitely with no on-chain time pressure on the admin to
   act. Confirmed live when `resolve_challenge("C-1", ...)` succeeded on
   `A-2` with no issue despite being called well after the original 900s
   verdict window would have closed, because filing the challenge already
   moved the agreement out of `CHALLENGE_WINDOW` into `CHALLENGED`, a state
   `finalize_verdict`'s window check never reaches. This is a real,
   previously undocumented design gap -- not a bug in the sense of incorrect
   behavior, but an absence of griefing protection: a malicious or merely
   slow admin could leave a challenged agreement stuck in `CHALLENGED`
   indefinitely, blocking both finalization and reputation/settlement.
   Recorded as a new open item in `docs/SECURITY_THREAT_MODEL.md`
   ("unbounded challenge-resolution latency") -- not fixed in this session,
   since fixing it is a design decision (e.g. an admin-resolution deadline
   with an automatic default outcome) that needs the user's judgment, not an
   unreviewed unilateral contract change right after a live deployment.

4. **The stderr warning seen on both `request_evaluation` calls**:
   ```
   /py/libs/genlayer/gl/_internal/storage.py:21: UserWarning: Detected
   pickling storage class. Reading storage in nondet mode is not supported
   warnings.warn(
   ```
   appeared identically on both `A-1` and `A-2`'s evaluation calls, and in
   both cases execution still returned `SUCCESS` with correct, consistent
   leader/validator-agreed results. This is a real runtime warning from the
   pinned GenVM SDK, not fabricated or glossed over -- but its practical
   impact here is unproven: the two live runs that triggered it produced
   correct results both times. Recorded as an open item in
   `docs/SECURITY_THREAT_MODEL.md` and `docs/FINAL_HANDOFF.md`
   ("nondet-mode storage pickling warning") pending a closer read of what
   storage access inside `_run_module_evaluation`'s leader/validator closures
   is triggering it, and whether it indicates a latent correctness risk under
   different evidence/rubric inputs than the two tested here. Not yet
   root-caused; flagged honestly rather than assumed harmless.

5. **Everything else behaved exactly as the contract's code and the prior
   audit predicted**: `_coerce_address` handled the deployer's address being
   passed as a decimal integer in `create_agreement`'s `counterparty`
   parameter (visible in Studio's decoded params) without any issue, no
   duplicate-evidence rejections were hit (each content_hash submitted was
   deliberately made distinct), and all consensus rounds were 5/5 unanimous
   with no validator disagreement observed in either run.

## What this run proves, and what it does not

**Proven live, for the first time:** deployment succeeds, module/policy
registration works, the full agreement state machine transitions correctly
end-to-end including both the no-challenge and challenge-and-reject paths,
real leader/validator LLM-adjudicated evaluation against a live web fetch
produces consistent PASS decisions with citation to the correct evidence IDs,
and reputation events are recorded only on finalization as designed.

**Not yet exercised:** the `upheld=true` branch of `resolve_challenge`
(re-evaluation path), `request_rework`/`acknowledge_recovery`, any
settlement/authorize_settlement call, delegation accept/revoke, agent
registration/revocation, the `agent-task` module (only `api-delivery` was
tested), any FAIL/PARTIAL/INSUFFICIENT_EVIDENCE decision outcome (both real
evaluations happened to return PASS), and any payable/value-bearing call
(both test agreements used `amount_atto=0`).

## Verdict

**CONDITIONALLY VERIFIED LIVE** -- the core adjudication lifecycle is now
proven on real StudioNet consensus, not just direct-mode tests. Finding 3
(unbounded challenge-resolution latency) is a genuine open design gap
surfaced by this live run that did not appear in prior direct-mode testing,
and finding 4 (the pickling warning) needs a follow-up root-cause pass before
being dismissed as benign. Neither finding invalidates what was proven
working; both are now tracked, not hidden.
