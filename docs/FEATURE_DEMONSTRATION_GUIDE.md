# Feature Demonstration Guide

A concrete "how to see this working yourself" guide for the most
interesting proven features, using the live V2 deployment
(`0xCC67216ceD224A971739bAA706142A740B31853C`, StudioNet, chain 61999 — the
frontend's default as of this pass). Everything below is either (a)
directly reproducible as a read-only lookup in the running frontend with
no wallet required, or (b) already recorded with real transaction hashes
in the verification reports this guide points to rather than duplicating.

Start the frontend: `cd web && npm ci && npm run build && npm run preview
-- --host 127.0.0.1 --port 4173`, then open `http://127.0.0.1:4173`. No
wallet is required for any lookup below — these are all read-only contract
queries. See `README.md` for connecting a wallet if you want to try a
write yourself.

## 1. The Stage 6 challenge-timeout-recovery fix

**What it is:** before Stage 6, an admin who never called `resolve_challenge`
left an agreement stuck in `CHALLENGED` forever — no finalization, no
settlement, no reputation event, with no on-chain time pressure to act.
`resolve_challenge_by_timeout` is a new, deliberately **permissionless**
method (anyone can call it, not just a party or the admin) that lets the
agreement recover once the challenge's own resolution deadline passes,
always upholding the original verdict (never auto-upholding the challenge
— see `contracts/agentverdict.py` lines 1290-1364 for the full reasoning
in the method's own docstring).

**See it working:**
1. Open **Appeals Tribunal**, enter agreement `A-1`. You'll see it is
   `FINALIZED`.
2. Scroll to "Look up a challenge", enter `C-1`. You'll see the real
   on-chain record: state `TIMEOUT_REJECTED` (a tag distinct from a normal
   admin `REJECTED`, so the audit trail is unambiguous) and the exact
   resolution message: *"[TIMEOUT] admin did not call resolve_challenge
   before the resolution deadline; original verdict upheld automatically,
   no discretionary judgment applied."*
3. Full call-by-call record with real transaction hashes and 5/5 validator
   consensus: `docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md`, section
   "`A-1` — the primary test," step 6.
4. Automated coverage: `tests/direct/test_challenge_timeout.py` (9 tests —
   deadline set on filing, pre/post-deadline behavior, permissionless-caller
   success, double-call idempotency, full finalize/reputation parity).

## 2. The `PARTIAL` decision path

**What it is:** the contract's three-way (actually four-way, counting
`INSUFFICIENT_EVIDENCE`) decision outcome isn't a binary pass/fail — a
`PARTIAL` decision halves the authorized settlement amount
(`authorize_settlement`'s `amount if decision == "PASS" else amount // 2`)
and is driven by genuinely mixed per-criterion results, not a fixed
middle value.

**See it working:**
1. Open **Verdict Theater**, enter agreement `A-6`.
2. You'll see the real criterion breakdown: `endpoint_coverage` → `PASS`
   (backed by a real reachable page), `error_handling` →
   `INSUFFICIENT_EVIDENCE` (backed by a genuine 404), with overall
   `decision: PARTIAL` — the first live `PARTIAL` outcome recorded on
   either deployment.
3. Full record: `docs/V2_REMAINING_PATHS_VERIFICATION_REPORT.md`, section
   "`PARTIAL` decision outcome."

## 3. The two-tier leader/validator LLM adjudication

**What it is:** every `request_evaluation` call runs the evaluation logic
twice — once as the GenVM consensus leader, once per validator — inside
`gl.vm.run_nondet`, and the network only accepts a result once
leader/validator outputs satisfy an equivalence check (see
`docs/EQUIVALENCE_MATRIX.md` for exactly what is and isn't compared).
This is why a "Rotation Count" sometimes appears above 0: it means the
validators initially disagreed with the first proposed leader and a new
leader was elected before consensus was reached.

**See it working:**
1. Open **Verdict Theater**, enter agreement `A-7`, and look at attempt #2
   — real leader/validator-agreed `PASS`, uncertainty `LOW`.
2. Attempt #1 on the same agreement (visible via its attempt history, or
   in `docs/V2_REMAINING_PATHS_VERIFICATION_REPORT.md`'s "`resolve_challenge
   (upheld=true)`" section) is the one recorded instance across both
   deployments where **Rotation Count: 1** — a real leader rotation
   occurred before validators settled on a final result, direct evidence
   the multi-validator consensus mechanism is actually exercising
   disagreement-and-reconciliation, not just rubber-stamping one node's
   output.
3. Honest limitation, stated plainly rather than hidden: the `eq_principle`
   wrapper pattern (GenVM's purpose-built leader/validator equivalence
   primitive) could not be exercised in this workspace's direct-mode test
   harness — `tests/direct/` tests the evaluation logic's determinism
   directly in Python, not through the actual `gl.vm.run_nondet` dispatch
   path, because no local GenVM runtime with an LLM backend was available
   to this agent. The live StudioNet runs are therefore the *only* real
   evidence this mechanism works end-to-end, which is exactly why they
   matter.

## 4. The receipt-only settlement safety pattern

**What it is:** this contract never custodies or moves real value. No
method is `@gl.public.write.payable`. `authorize_settlement` and
`record_settlement` only ever produce and update a `SettlementInstruction`
record (`AUTHORIZED` → `EXECUTED`/`BLOCKED`); `settlement_native_transfer_enabled`
defaults `False`, and flipping it on causes `record_settlement` to raise an
honest, explicit "unverified stub" error rather than attempt a real
transfer API nobody has verified against this runtime.

**See it working:**
1. Open **Settlement Ledger**, enter agreement `A-2`.
2. You'll see a persistent banner: *"AUTHORIZATION RECEIPT ONLY — NO REAL
   ASSET CUSTODY,"* status `EXECUTED`, a real authorized amount
   (`1000000000000000000` atto-GEN — purely symbolic, nothing changed
   hands), the real recipient address, and the real `PASS` decision that
   justified the full (non-halved) amount.
3. Full record: `docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md`, section
   "`A-2` — settlement path."
4. Automated coverage of the disabled-by-default/honest-error path:
   `tests/direct/test_settlement.py` (`test_settlement_disabled_by_default`,
   `test_native_transfer_enabled_blocks_record_settlement_as_unverified_stub`,
   `test_double_settlement_rejected`).

## 5. Live cross-deployment (V1/V2) regression evidence

**What it is:** V1 (`0xb222305575ee8af1255d8aCd196280b405B54Baf`) and V2
(`0xCC67216ceD224A971739bAA706142A740B31853C`) are two independent, real
StudioNet deployments of the same contract family at different points in
its evolution — not a staging/production pair, but genuine before/after
evidence that the Stage 6 fixes changed real, observable on-chain
behavior.

**See it working:**
1. On **Settings**, click "Fill in V1 address" and save it, then open
   **Appeals Tribunal** and look up V1's agreement `A-2` — you'll see its
   `resolve_challenge` call succeeded with no deadline check at all (the
   exact gap Stage 6 fixed), because V1 has no
   `resolve_challenge_by_timeout` method.
2. Reset to the V2 default and look up V2's `A-1`/`C-1` (section 1 above)
   to see the fixed behavior on the same family of contract, a different
   address.
3. Full side-by-side: `docs/STUDIONET_LIVE_VERIFICATION_REPORT.md` (V1)
   versus `docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md` (V2) — the V2
   report's "Stage 6 follow-up" and "What this run proves, beyond the V1
   report" sections state the comparison explicitly.

## Screenshots

See `docs/screenshots/` for real captures of the running frontend (taken
against live V2 chain reads during this pass, not mocked):
`01-landing.jpg`, `02-protocol-telemetry.jpg`,
`03-agent-atlas-revoked-passport.jpg`, `04-evidence-observatory.jpg`,
`05-verdict-theater.jpg`, `06-appeals-tribunal-timeout-rejected.jpg`,
`07-settlement-ledger.jpg`, `08-settings-v2-default-v1-historical.jpg`.
