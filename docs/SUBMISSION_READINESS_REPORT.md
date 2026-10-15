# Submission Readiness Report

> **Latest release addendum (2026-10-15):** Stage 12 is deployed via GenLayer
> Studio at `0x78ABE3E68cb5ca3325a482f23AA8F2AA4173DC40`. A synthetic, zero-value
> A-2 lifecycle reached `SETTLED` after evaluation, challenge timeout recovery,
> finalization, and receipt-only settlement. This supersedes the older Stage 12
> “not deployed” statements below. Explorer deployment transaction
> `0x25c9111c7c75f5b202d5c84bb07ed47cee85bc9419c217e988b33c94705464dd` is
> finalized/accepted; SHA-256 of embedded deployed `contract_code` exactly
> matches candidate source `897ad39a…92ca1abe`. Latest frontend deployment
> `dpl_2MCWXALuMEimAF8zmKoQPn4ZuE8o` is READY and targets Stage 12 at
> [the production URL](https://web-gqjwiv8go-chinny070s-projects.vercel.app)
> (stable alias: https://web-omega-amber-37.vercel.app), from commit `7f399b6`.
> The public Settings page reports `SCHEMA MATCHES`,
> Protocol Telemetry returns live counters, all 14 screens passed five viewport
> widths without page-level overflow, and an Appeals Tribunal hash route survived
> refresh. A Chrome/MetaMask signed write created Stage 12 agreement `A-5` with
> zero GEN; Explorer confirms the Stage 12 target, wrapped rubric JSON, GenVM
> success, and accepted consensus. The earlier Stage 11 malformed attempt rolled
> back without creating an agreement. The receipt parser was subsequently fixed
> to inspect GenLayer JS 1.1.8's nested `consensus_data.leader_receipt` execution
> result; three regression cases cover success, error, and missing result. The
> live A-5 transaction predates this parser deployment, so post-fix wallet UI
> finality has not been independently re-exercised. See the Stage 12 addendum
> and deployment ledger.

> **Receipt-fix follow-up (2026-10-15):** A new Chrome/MetaMask signed
> `create_agreement` against Stage 12 finalized successfully as agreement
> `A-6` with amount 0. Explorer shows FINALIZED, accepted consensus, GenVM
> SUCCESS, and return value `A-6`:
> [transaction](https://explorer-studio.genlayer.com/tx/0xdadeab03361858ce6d17f3a7e59ef57f4985d763788a811c1981078d8f27c91d).
> The earlier hosted frontend release displayed FAILED for this transaction.
> Inspection of the GenLayer JS 1.1.8 receipt showed the successful leader
> return alongside a validator execution explicitly cancelled after quorum
> (`CONSENSUS_VALIDATOR_QUORUM_REACHED`). The client incorrectly treated that
> cancellation row as a conflicting execution. The receipt parser now ignores
> only this explicit quorum-cancellation code, still fails closed on ordinary
> errors/conflicts, and surfaces the return value so Agreement Forge can load
> the new ID. Focused receipt tests pass (9/9); full frontend tests pass
> (44/44), TypeScript and production build pass. These local changes are not yet
> deployed, so corrected hosted-UI finality and automatic A-6 loading remain
> unverified until the next Vercel release is live and exercised.

> **Verification record (2026-10-15):** contract suite 94 passed, 7 skipped;
> the focused attempt-three upheld-challenge regression passed (1/1), confirming
> terminal `TERMINATED` state, a `VOID` verdict, no settlement or reputation
> effect, and replay rejection. TypeScript check passed; frontend suite 42
> passed; production build passed with the existing large-chunk warning. The
> live production Telemetry screen read Stage 12 counters (5 agreements, 1
> evidence packet, 1 challenge, 1 settlement, 1 reputation event) and confirmed
> native GEN transfer disabled. The seven GenVM integration tests remain
> skipped: GLSim has the documented storage-registration mismatch, no local
> GenVM/Docker daemon is running, and evaluator consensus tests also require an
> LLM provider credential. No SDK internals were changed. The browser exposed
> only the wallet-less in-app session, so a post-fix signed UI write and live
> attempt-three path could not be run in this pass.

> **Historical Stage 11 snapshot (2026-10-15):** Stage 11 hardening is deployed
> at `0xab972c3af9878b7CD4631CD21639B20E981B0702`, and its two synthetic
> zero-value lifecycles completed through settlement. The production frontend
> then defaulted to Stage 11 (Vercel deployment `DCZArRbeK923gwJFRnv3E9GyuDbD`,
> source commit `241df400ccf4f1e410d8f46884bdc9c08aca4c58`). Its rubric payload
> correction was live at that stage. This snapshot is superseded by the Stage 12
> release above: Stage 12 has a successful signed frontend write (A-5), while a
> post-receipt-parser signed write and live non-admin timeout caller remain
> unverified. The earlier signed malformed Stage 11 call rolled back without
> creating an agreement. Stage 11 hardens settlement,
> bounded challenges, adjudication validation, retry accounting, policy and
> delegation scope, and frontend transaction finality. It is deployed. V1/V2
> remain historical immutable deployments. Consult
> [STAGE_11_CORRECTNESS_AUDIT.md](STAGE_11_CORRECTNESS_AUDIT.md) for the
> current verdict and test record.

**Date:** 2026-10-14/15 (submission-polish pass, following the Stage 6 fix and
the three live V2 verification reports)
**Scope:** this is a final, honest assessment of what is actually proven
versus what remains unverified, compiled by independently re-reading the
contract source, the frontend source, every prior verification report, and
by live-exercising the running frontend against real V2 chain reads in a
browser pane during this pass. Nothing in this document is based on memory
of what "should" be true — every claim below is traceable to a specific
source file, test, or recorded live transaction.

Status values used: **PASS** (independently verified, no material gap),
**PARTIAL** (real, substantial evidence with a stated, bounded gap),
**BLOCKED** (not verified; blocked on something outside this agent's
authority — no signing key).

---

## 1. Contract correctness — PASS (with stated scope)

- `genvm-lint check contracts/agentverdict.py --json`: `{"ok":true}`, 40
  methods (12 view, 28 write), 0 ctor params. One informational warning
  (`I200`, a newer runner is available) — not an error.
- `pytest tests/direct/ -v`: **81 passed, 0 failed, 0 skipped** against the
  real downloaded pinned GenVM SDK (v0.2.16), re-run in this pass and
  matching the Stage 6 baseline exactly (70 pre-Stage-6 + 9
  `test_challenge_timeout.py` + 2 `test_storage_pickling_regression.py`).
- Independently re-verified in this pass, by reading the source directly
  (not trusting prior summaries): `resolve_challenge_by_timeout` (lines
  1290-1364) is genuinely permissionless (no `_require_party`/`_require_admin`
  guard), gated only on `challenge.state == "OPEN"`, `agreement.state ==
  ST_CHALLENGED`, and the resolution deadline having passed; it always
  upholds the original verdict and tags `TIMEOUT_REJECTED`, matching every
  claim in `docs/STAGE_6_MIGRATION_NOTE.md` and `docs/SECURITY_THREAT_MODEL.md`
  item 8. `_run_llm_adjudication` (line 957) extracts plain `str` fields into
  ordinary dicts (`bounded_rows = [{...} for row in evidence_rows[...]]`)
  strictly before `leader_fn`/`validator_fn` are defined, matching the
  item-9 fix description exactly. `_coerce_address` (line 76) handles
  `Address`, `bytes`, `int` (via `to_bytes(20, "big")`, never `Address(int)`),
  and `0x`-prefixed/bare hex `str`.
- Integration tests (`tests/integration/`): still honestly skipped (no
  running GenVM node or LLM provider available to this agent) — this gap is
  **not** closed by automated tests, but it is substantially closed by the
  three manual live-StudioNet verification reports (section 2 below), which
  exercise the same evaluation paths on real consensus instead.

**Gap, stated plainly:** no fuzzing or property-based testing exists; the
81 direct-mode tests are example-based, hand-written negative/positive
cases. This is adequate confidence for a submission, not exhaustive
verification.

## 2. Live chain verification — PASS for V2's breadth, PARTIAL on documentation completeness

- V2 (`0xCC67216ceD224A971739bAA706142A740B31853C`) has had **every one of
  its 28 public write methods exercised at least once** via real signed
  transactions through Studio's UI, across three sessions
  (`docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md`,
  `docs/V2_REMAINING_PATHS_VERIFICATION_REPORT.md`, plus the original
  `docs/STUDIONET_LIVE_VERIFICATION_REPORT.md` for V1). This is real
  evidence of a kind no amount of direct-mode testing can substitute for:
  real 5/5 validator consensus, a real LLM backend, real wallet signatures.
- **Independently re-confirmed in this pass** by configuring the running
  frontend against V2 and reading live chain state in a browser pane (no
  write attempted — this agent has no wallet): Protocol Telemetry shows 7
  agreements, 7 evidence packets, 1 delegation, 2 challenges, 1 settlement,
  3 reputation events, admin `0xaffE15…E8e70b`, settlement-native-transfer
  `DISABLED`. Agent Atlas correctly shows the admin passport as `REVOKED`
  (matching the deliberate self-revocation in the remaining-paths report)
  and the counterparty passport as not revoked with real non-zero
  `completed`/`disputed`/`reputation` counts. Evidence Observatory correctly
  renders A-1's real provenance table (E-1/E-2/E-3, submitter, freshness).
  Verdict Theater correctly renders A-7 attempt #2's real `PASS`/`FINAL`
  verdict citing `E-7`. Appeals Tribunal correctly renders challenge `C-1`'s
  real `TIMEOUT_REJECTED` state and its exact on-chain resolution message.
  Settlement Ledger correctly renders A-2's real `EXECUTED` settlement
  receipt. None of this is fabricated or cached — it is a real RPC round
  trip to StudioNet for each screen, confirmed via the frontend's own
  `genlayer-js` client, not a mock.
- **Documentation-completeness gap found in this pass:** the storage-pickling
  fix's "every V2 `request_evaluation` call showed empty stderr" claim is
  explicitly documented with stderr status for 3 calls (A-1 attempt 1, a
  second A-1 call across its rework cycle, and A-2 — see
  `docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md`). The later
  `docs/V2_REMAINING_PATHS_VERIFICATION_REPORT.md` session added at least 3
  more live `request_evaluation` calls (A-6's `PARTIAL` outcome, A-7
  attempts 1 and 2) but **does not explicitly restate stderr status for
  any of them** — it is not mentioned either way. This is not evidence a
  warning appeared; it is a real gap in what was written down. The accurate
  claim is: **empty stderr is explicitly confirmed for 3 of the (at least)
  6 live V2 `request_evaluation` calls on record; the other 3 are
  undocumented on this specific point, not contradicted.** Flagged here
  rather than silently treating the broader claim as fully proven.
- **A second, independent documentation bug found and corrected in this
  pass:** `deployments/studionet.json`'s `v2_deployment.source_hash` field
  had copy-pasted V1's pre-Stage-6 hash instead of the actual Stage-6
  source hash. Verified via `git show 721f5b9:contracts/agentverdict.py |
  sha256sum` (= `e9d4c1314cce2d701fe5f105f28192a5200536d0c8e1f173f46e988e4b795ecb`,
  matching the current working tree) versus `git show
  28e00b6:contracts/agentverdict.py | sha256sum` (=
  `7b286f034540e12b153bca0e343bde0073e304c202bc61e7e80e676fe138aa5e`, the
  value that had been wrongly duplicated into the V2 record). Corrected in
  `deployments/studionet.json` with the correction itself documented
  in-place. No evidence the wrong source was ever actually deployed — this
  was a transcription error in the JSON record, not a deployment defect.

## 3. Frontend completeness — PASS for the P0 surface, with concrete fixes made this pass

All 14 screens (Landing, Command Deck, Agreement Forge, Agent Atlas, Mission
Control, Evidence Observatory, Verdict Theater, Appeals Tribunal, Recovery
Center, Settlement Ledger, Adapter Foundry, Simulation Chamber, Protocol
Telemetry, Settings) were navigated in a real browser pane this pass; zero
console errors on any screen, zero blank pages, zero broken navigation.

**Issues found and fixed this pass:**
1. The frontend had no default contract address (empty, predating any
   deployment). Fixed: defaults to V2, with V1 preserved as a one-click,
   clearly-labeled "historical, read-only, superseded" option on Settings
   — never hidden or deleted (`web/src/chain/config.ts`,
   `web/src/state/ContractAddressContext.tsx`,
   `web/src/features/settings/Settings.tsx`).
2. Landing.tsx's "what is real / not real" panel was stale to the point of
   being actively misleading: it said "68/68 tests" (now 81/81), "no
   StudioNet deployment has happened" and "every screen shows an empty
   state until configured" — all false now that V2 is live and defaulted.
   Corrected to state what is actually true today.
3. A real horizontal-overflow bug at 375px mobile width
   (`document.documentElement.scrollWidth` = 511 vs `clientWidth` = 375),
   caused by a CSS grid track not being allowed to shrink below a long
   unbroken string's content width (a doc-path string introduced by fix
   #2 above exposed a pre-existing latent issue: grid children default to
   `min-width: auto`). Fixed generally in `global.css` (`min-width: 0` on
   grid children, `overflow-wrap: break-word` globally), not patched for
   the one triggering string — verified no overflow remains on 7 spot-
   checked screens at 375px.
4. Confirmed genuinely honest write-gating: `Agreement Forge`'s "Create
   agreement" button has a real `disabled` DOM attribute (not just dimmed
   styling) until a wallet connects, with explanatory helper text.
   Confirmed via direct DOM inspection, not visual inference.
5. Confirmed keyboard accessibility: `Tab` navigation produces a real,
   visible focus ring (`box-shadow: 0 0 0 3px` cyan) on focused elements —
   `outline: none` is paired with a replacement indicator, not simply
   removed.

**Verified, not merely asserted:** `web/typecheck` clean, `npx vitest run`
20/20 passing (19 baseline + 1 new ConfigGate case for the explicit-opt-out
sentinel), `npm run build` succeeds (786 kB main chunk, pre-existing
>500kB warning, unrelated to this pass's changes).

**Not verified in this pass, stated honestly:** no real wallet-signed write
was attempted (this agent has no signing key and none was simulated) —
every write-path screen's honest "connect wallet" gate was confirmed
instead of the write itself. This is consistent with, not a regression
from, the project's existing hard boundary.

## 4. Security posture — PARTIAL (real, substantial coverage; stated open risks unchanged)

Invariant-by-invariant table against `AGENTVERDICT_OS_PRODUCT_PROTOCOL_DESIGN_SPEC.md`
section 7 ("Financial and safety invariants"). Category key: **LIVE** = tested
with a real StudioNet transaction hash; **DIRECT** = covered by a passing
`tests/direct/` test only; **SOURCE** = verified by reading the contract
source in this pass, not independently tested by either of the above.

| # | Invariant | Status | Evidence |
|---|---|---|---|
| 1 | Funds never move merely because a model says "pay"; deterministic authorization/balance/recipient/amount/finality gates mandatory | **LIVE** | `authorize_settlement`/`record_settlement` called live on V1's A-2 and V2's A-2 with real tx hashes; decision-to-amount mapping (`amount if PASS else amount // 2`) is deterministic contract logic, not LLM-controlled |
| 2 | Settlement authorization-receipts-only; real escrow/payout visibly disabled | **LIVE** (default path) + **DIRECT** (flipped-on path) | Default-`False` path live-confirmed on V2's A-2 (`EXECUTED` receipt, no transfer attempted); the flipped-`True`-blocks-with-honest-error path is covered by `test_native_transfer_enabled_blocks_record_settlement_as_unverified_stub` only — deliberately never toggled live, per the remaining-paths report's own stated reasoning ("unsafe to test live given its documented unverified-stub behavior") |
| 3 | No arbitrary agent may alter frozen policies, submit on another's behalf, or exceed delegation bounds | **DIRECT** (policy freeze, sender checks) + **SOURCE** (delegation spend-cap is stored/read but not yet consumed by any spend path — feature 19 is PARTIAL by design, not a violation, since no money-moving path exists to exceed) | `test_state_machine.py`, `test_access_control.py`; every live tx is itself sender-authenticated by GenVM/the signing wallet, which is a structural guarantee of the chain, not a contract-level test |
| 4 | Every appeal tied to a specific provisional/finalizable verdict and authorized grounds | **LIVE** | `C-1` (V1), `C-1`/`C-2` (V2) all filed against a specific `agreement_id` in `CHALLENGE_WINDOW`, real tx hashes |
| 5 | No reputation update from provisional verdicts | **LIVE** + **SOURCE** | `_apply_reputation_event` has exactly one call site (inside `finalize_verdict`), confirmed by reading source; cross-checked live in the V2 report against the counterparty passport's exact arithmetic, and independently re-spot-checked in this pass via a live Agent Atlas lookup showing non-zero, internally-consistent counts |
| 6 | Evidence hashes are integrity commitments, not authenticity proofs | **SOURCE** (design property) + **DIRECT** (storage-only half) | `test_evidence.py::test_evidence_packet_never_stores_raw_content`; the "not a proof of authenticity" half is a documented design statement, not independently testable as a runtime behavior |
| 7 | No private API tokens or personal data on-chain/in logs/bundles | **SOURCE** + **DIRECT** (partial) | No field anywhere in `Agreement`/`EvidencePacket`/`Verdict` accepts secrets; `test_evidence_packet_never_stores_raw_content` covers the evidence-storage subset specifically |
| 8 | No automatic high-stakes penalties based only on inferred collusion/speculative causality | **LIVE** + **DIRECT** | `resolve_challenge_by_timeout` always upholds the original verdict, never auto-upholds the challenge — live-verified on V2's A-1/C-1 with real 5/5 consensus, plus 9 direct-mode tests in `test_challenge_timeout.py` |
| 9 | Upgrade/module changes cannot silently affect existing accepted agreements | **DIRECT** | `test_agent_task.py::test_agent_task_module_version_bound_to_agreement`; `update_policy_template` was exercised live (revision 2→3) but that specific live test targeted *new*-agreement rejection against an inactive policy, not a re-check that an *existing* agreement's frozen hash survived the update untouched — not independently live-re-verified for that exact guarantee |
| 10 | All network failures preserve honest transaction status and retry safety | **SOURCE** (frontend only) | `web/src/chain/transactions.ts::runWrite` distinguishes consensus status from execution result and never reports false success — verified by reading the source; no live write failure was ever observed to exercise this path end-to-end (this agent has no wallet to trigger one), and GenVM's own chain-level retry semantics are outside this project's test boundary |

**Open risks, unchanged from `docs/SECURITY_THREAT_MODEL.md`, restated
plainly rather than re-litigated:** no challenge bond (free-to-challenge
griefing vector if deployed with high-value agreements); admin
centralization for module registry and challenge-merit decisions (the
Stage 6 timeout fix removes the *liveness* risk, not the *discretion*);
source substitution between leader/validator fetch has only independent
re-fetch as a defense; Sybil-resistant reputation is not implemented;
`genvm-lint`/Studio runtime version skew is a known, unclosed gap (one
`I200` informational warning on this run); the time-source claim
(`datetime.now(UTC)` being GenVM-deterministic) is held with high
confidence from documentation and a passing determinism test, but was
never independently confirmed at the real-WASM level by this project.

## 5. Documentation — PASS

Every major claim in this report traces to a named file/line/test/tx hash.
Two real inconsistencies were found and corrected during this pass (the
V2 `source_hash` copy-paste bug, section 2; the stale Landing.tsx copy,
section 3) rather than left in place. The one remaining honest gap (partial
stderr documentation for later V2 evaluation calls, section 2) is recorded
here rather than silently resolved in V2's favor.

## 6. Test coverage — PASS

| Suite | Before this pass | After this pass |
|---|---|---|
| `genvm-lint check` | `ok:true`, 40 methods | unchanged, re-confirmed |
| `pytest tests/direct/` | 81 passed | 81 passed (unchanged — no contract code was touched this pass) |
| `web: npm run typecheck` | clean | clean |
| `web: npx vitest run` | 19 passed | **20 passed** (+1: `ConfigGate` explicit-opt-out case, added as a regression test for the default-address change) |
| `web: npm run build` | succeeds | succeeds |

## 7. Overall verdict

**PASS for a public demonstration / submission, precisely scoped as
follows.** This is not "production ready" — that claim is deliberately
avoided per the user's explicit instruction, and several real, named gaps
remain open (no challenge bond, admin-discretion centralization, no
fuzzing, the partial stderr-documentation gap, no live wallet-signed write
exercised by this agent in this session). What **is** true, each backed by
a specific, checkable artifact: the contract is lint-clean and 81/81
direct-mode tested; the three Stage 6 claims (timeout-recovery,
storage-pickling fix, `_coerce_address`) are independently re-verified
against the actual deployed source in this pass, not merely re-quoted from
prior reports; V2 has had every public write method exercised live with
real transaction evidence; the frontend renders real, correct, live V2
data across all 14 screens with zero console errors, a genuinely honest
wallet-gate on every write action, and the two concrete bugs found during
this pass (stale Landing copy, mobile overflow) are fixed and verified, not
just logged as follow-ups.

## 8. Requires the user's decision before any further action

No redeploy is recommended or warranted by anything found in this pass.
The two inconsistencies found (source_hash transcription error, stale
Landing copy) were documentation/UI bugs, not contract defects, and both
are now corrected in this same pass — nothing here rises to "the deployed
V2 contract itself needs to change." If the user wants the open design
gaps (challenge bond, admin-discretion centralization) addressed, that is
a new-feature decision for the user to make explicitly, not something this
pass took it upon itself to implement.

## 9. Independent re-verification (follow-up session, after a rate-limit cutoff)

The pass that produced sections 1-8 above stated it would run a final full
test pass before committing, then was cut off before that pass actually
executed. A follow-up session re-ran every command fresh, from a clean
`git status`, with no code changes made first (to test the claims as
written, not a moving target):

| Check | Command | Result | Matches sections 1-8? |
|---|---|---|---|
| Contract lint | `genvm-lint check contracts/agentverdict.py --json` | `ok:true`, 40 methods (12 view / 28 write), 0 ctor params, one `I200` info warning | Yes — exact match |
| Direct-mode tests | `pytest tests/direct/ -v` | **81 passed, 0 failed, 0 skipped** | Yes — exact match to the stated 81/81 baseline |
| Frontend typecheck | `cd web && npm run typecheck` | clean, no errors | Yes |
| Frontend unit tests | `npx vitest run` | **20 passed** (5 files) | Yes — exact match |
| Frontend build | `npm run build` | succeeds, main chunk 786.10 kB (pre-existing >500kB warning) | Yes — exact match down to the chunk size |

Also independently re-checked in this follow-up session, not just re-quoted:
`sha256sum contracts/agentverdict.py` on the current working tree returns
`e9d4c1314cce2d701fe5f105f28192a5200536d0c8e1f173f46e988e4b795ecb`, matching
`deployments/studionet.json`'s corrected `v2_deployment.source_hash` exactly
— the section 2 correction is confirmed, not merely asserted. The
`web/src/chain/config.ts` resolution order (localStorage override → env var
→ built-in V2 default, with an explicit opt-out sentinel) was read in full
and contains no fallback bug. The `global.css` mobile-overflow fix
(`min-width: 0` on grid children, global `overflow-wrap: break-word`,
`overflow-x: hidden` on `body`) is a genuine layout fix, not a cosmetic
no-op. `docs/FEATURE_DEMONSTRATION_GUIDE.md` and `docs/PROTOCOL_ARCHITECTURE.md`
(section 8's status note) were confirmed already adequate and were not
duplicated. All 8 files referenced from `docs/screenshots/` were confirmed
present on disk and correctly sized (29-60 KB each, not placeholders).

**No drift found.** Every number in sections 1-8 holds up against a fresh,
independent run in a separate session. No code or test changes were needed
as a result of this re-verification; this section exists only to convert
the earlier, never-actually-run "final test pass" claim into a genuinely
checked one.

## 10. Stage 9 — Vercel production deployment verification (2026-10-14)

The frontend (`web/`, unmodified by this pass except for this documentation
and the addition of a stable Live Demo URL to `README.md`) was deployed to
Vercel as static-site/SPA hosting — no backend, API route, serverless
function, or database introduced. Build: `npm run build` (`tsc --noEmit &&
vite build`) in Vercel's own build environment, Vite framework
auto-detection, output directory `dist` (default). No blockchain transaction
was signed or sent as part of this deployment or its verification — Vercel
hosting involves no chain interaction, and this agent holds no StudioNet
signing key, consistent with this project's absolute hard boundary.

**Deployment facts:**
- Vercel project: `chinny070s-projects/web` (project ID
  `prj_fbSU6AI5aDFOfiC9FyPlldOHPzZ5`).
- Production deployment: `dpl_36BndqyqcZn89maBkcbXovEHzeKe`, status `READY`,
  target `production`.
- Stable production URL (survives future `--prod` redeploys):
  `https://web-omega-amber-37.vercel.app`.
- Per-deployment URL (this specific build):
  `https://web-7ql48eyd3-chinny070s-projects.vercel.app`.
- Environment variable `VITE_CONTRACT_ADDRESS` explicitly set to
  `0xCC67216ceD224A971739bAA706142A740B31853C` (V2) for the Production
  environment, confirmed via `vercel env ls` before deploying. No other
  `VITE_*` variable is read anywhere in `web/src` (confirmed by grep) — the
  app's own built-in default (`web/src/chain/config.ts`) already matches V2,
  so this env var is a deliberate explicit pin, not a silent reliance on a
  fallback.
- Router is `HashRouter` (`web/src/App.tsx`), confirmed by reading the
  router config directly — all routes live under the `#/...` fragment,
  which the server never sees, so **no SPA rewrite rule (`vercel.json`) was
  required or added**; this is a structural property of hash routing, not
  an oversight. Verified live (see below): a hard refresh on a nested route
  renders correctly with no 404.
- No secret, private key, or API key found anywhere in `web/` or any `.env*`
  file (grepped explicitly for common secret patterns — the only matches
  were unrelated words like "risk" and "mask" in component/CSS names). The
  only public env var in use, `VITE_CONTRACT_ADDRESS`, is a public contract
  address by design — genlayer-js talks directly to the public StudioNet
  RPC with no API key of any kind.
- `.vercel/` (containing the project link and a local OIDC token) and
  `.env*` are both gitignored in `web/.gitignore` (written automatically by
  the Vercel CLI on first link, matching Vercel's own documented
  convention — confirmed by reading the file, not assumed). Nothing under
  `.vercel/` was committed.

**Live browser verification performed this pass** (via the built-in browser
pane, real network calls, no simulation):
- Landing, Command Deck, Agreement Forge, Agent Atlas, Mission Control,
  Evidence Observatory, Verdict Theater, Appeals Tribunal, Recovery Center,
  Settlement Ledger, Adapter Foundry, Simulation Chamber, Protocol
  Telemetry, and Settings all navigated successfully on the live production
  URL — no blank pages, no build-error screens, no 404s.
- **SPA-refresh test:** navigated directly to `/#/telemetry` and performed a
  real hard refresh (F5). The page reloaded correctly and re-rendered live
  chain data — confirming the hash-routing approach needs no server-side
  rewrite, and that the deployed static site serves `index.html` correctly
  on a full reload regardless of the current hash.
- **Real-RPC confirmation:** Protocol Telemetry on the live production URL
  shows Agreements 7, Evidence 7, Delegations 1, Challenges 2, Settlements
  1, Reputation Events 3, admin `0xaffE15…E8e70b`, settlement native
  transfer `DISABLED` — matching this report's section 2 exactly. Confirmed
  via `performance.getEntriesByType('resource')` that a real network
  request fired to `https://studio.genlayer.com/api` (duration ~5.5s,
  consistent with a real RPC round trip, not a mock). Evidence Observatory
  looked up agreement `A-1` live and rendered its real E-1/E-2/E-3
  provenance table with real submitters and freshness — matching section 2
  again.
- **Error handling:** entered a deliberately invalid value
  (`not-a-valid-address`) into Agent Atlas's passport lookup field. The UI
  surfaced a real, honest error ("Missing or invalid parameters... Details:
  execution failed Version: viem@2.57.5") instead of crashing; the
  corresponding `GenLayer RPC error (gen_call): execution failed` appeared
  in the browser console as an expected, logged error, not an unhandled
  exception.
- **Honest write-gating confirmed on the live deployment:** Agreement
  Forge's "Create agreement" button has a real `disabled` DOM attribute
  (checked via direct JS, not visual inference) and the page states
  "Connect a wallet to submit."
- **Mobile viewport (375×812):** Landing, Protocol Telemetry, and Settings
  show no horizontal overflow (`scrollWidth === clientWidth === 375`),
  confirming the commit `1c85336` fix holds on the real deployed build for
  those screens. **New finding, not previously documented:** Adapter
  Foundry's contract method manifest table was **not** covered by that
  fix and does overflow at 375px (`scrollWidth` 757 vs `clientWidth` 375).
  Root cause, confirmed by inspecting computed styles: `body` has
  `overflow-x: hidden` (the commit 1c85336 fix), but `<html>` does not, and
  the table's wrapper `<div>` has no `overflow-x: auto`/scroll container of
  its own — so the table (four columns, ~117px each, ~470px+ total) escapes
  both containers and the whole page becomes horizontally scrollable at
  mobile width. This is a real, reproducible, still-open mobile-layout bug
  on one specific screen, not a regression introduced by this deployment —
  it was not one of the "7 spot-checked screens" the commit 1c85336 pass
  verified. Left unfixed in this pass since fixing frontend bugs was out of
  scope for a pure hosting/deployment task; flagged here explicitly rather
  than silently omitted.
- **Console errors:** checked across Landing, Command Deck, Agent Atlas,
  Evidence Observatory, Appeals Tribunal, Adapter Foundry, and Settings. The
  only error observed across all of them was the single expected
  `GenLayer RPC error (gen_call): execution failed` from the deliberate
  invalid-lookup test above (console log persists across client-side
  hash-route navigations within the same tab since there is no full
  reload) — no other error, on any screen.
- **Wallet integration — explicitly NOT fully testable in this session:**
  the built-in browser pane has no injected wallet provider
  (`window.ethereum` is undefined), and the Settings screen honestly
  reports "Not detected" / "Not connected" rather than fabricating a
  connection. No real wallet connection or signed transaction was attempted
  or simulated, consistent with this project's absolute hard boundary (no
  agent has ever held a signing key). This is a genuine, stated limitation
  of headless-browser verification, not a gap in the deployment itself.
- V1 (`0xb222305575ee8af1255d8aCd196280b405B54Baf`) confirmed unchanged and
  intact: the Settings screen still shows the full "V1 — historical
  deployment (read-only, superseded)" section verbatim, and README.md's V1
  row in the "Live deployments" table is untouched by this pass.

**Overall:** the production Vercel deployment faithfully reproduces the
locally-verified frontend behavior from sections 1-9 above, reads real live
V2 StudioNet data over a real RPC call, and introduces no backend, secret,
or blockchain-signing capability of any kind. One new, real, narrow mobile
layout bug was found (Adapter Foundry's method table) and is recorded here
rather than silently left out.

## 11. Stage 10 — Adapter Foundry mobile-overflow fix, full viewport sweep, redeploy

Follow-up pass fixing the one open bug from section 10 above (Adapter
Foundry's method manifest table overflowing at 375px) and verifying nothing
else was missed.

**Root cause (confirmed by reading computed styles, not guessed):** `body`
had `overflow-x: hidden` (from commit `1c85336`'s earlier fix) but `<html>`
did not, and the table's wrapper `<div>` had no scroll container of its
own — a wide `table-layout: auto` table has no way to shrink below its own
content width (unlike a grid/flex child, which commit `1c85336` already
fixed with `min-width: 0`), so the table pushed `<html>`'s own scrollWidth
past the viewport.

**Fix applied (`web/src/design/global.css`, `web/src/features/developer/AdapterFoundry.tsx`):**
- Added `overflow-x: hidden` to the `<html>` selector, completing the
  pattern commit `1c85336` started on `body` alone.
- Added a reusable `.table-scroll` utility class: `overflow-x: auto`,
  `max-width: 100%`, and a static inset box-shadow on both edges as a
  subtle, non-animated scroll affordance (respects
  `prefers-reduced-motion` trivially, since nothing animates) rather than
  JS-driven fade logic. `.table-scroll table { min-width: max-content; }`
  so the table keeps its real content width *inside* the scroll
  container instead of being squeezed.
- Wrapped the Adapter Foundry method manifest table in `.table-scroll` and
  added a `.table-scroll-hint` caption ("Scroll horizontally to see all
  columns."), shown only below a 700px viewport width via media query, so
  desktop users never see an irrelevant hint.
- Chose the scroll-container approach over reflowing the table into
  stacked cards, per the design spec's section 3 "dense but legible data
  tables" framing — this is the less invasive change and keeps the literal
  table aesthetic rather than replacing it with a generic card list.
- This was a deliberate, scoped CSS/markup fix only — `contracts/` was not
  touched, confirmed by `git status`/`git diff --stat` before committing.

**Full viewport sweep performed this pass** (local `vite preview` build,
not dev-server-only, via the Claude Browser pane's
`document.documentElement.scrollWidth` vs `clientWidth` — a difference
means overflow, checked programmatically, not eyeballed): all 14 screens
(Landing, Command Deck, Agreement Forge, Agent Atlas, Mission Control,
Evidence Observatory, Verdict Theater, Appeals Tribunal, Recovery Center,
Settlement Ledger, Adapter Foundry, Simulation Chamber, Protocol
Telemetry, Settings) at five widths (320px, 375px, 390px, 768px, 1280px) —
**70/70 combinations clean, zero overflow anywhere**, including Adapter
Foundry at 375px, which previously measured `scrollWidth` 757 vs
`clientWidth` 375 and now measures 375/375. Separately confirmed the fix's
containment is real, not just "page happens to not scroll": at 375px the
Adapter Foundry table itself is 1181px wide (40 methods, long param
lists), and that width is absorbed entirely by the `.table-scroll`
wrapper's own internal scrollbar (`wrapperScrollWidth` 1181 vs
`wrapperClientWidth` 343), while `document.documentElement`'s scrollWidth
still equals its clientWidth. No additional overflow was found on any
other screen at any width during this sweep, so no other CSS changes were
needed.

**Regression tests, re-run fresh after the fix (not before):**

| Check | Command | Result |
|---|---|---|
| Contract lint | `genvm-lint check contracts/agentverdict.py --json` | `ok:true`, 40 methods, unchanged |
| Direct-mode tests | `pytest tests/direct/ -v` | **81 passed, 0 failed, 0 skipped** — exact match to every prior baseline; confirms `contracts/` was not touched |
| Frontend typecheck | `cd web && npm run typecheck` | clean |
| Frontend unit tests | `npx vitest run` | **22 passed** (20 prior baseline + 2 new `AdapterFoundry.test.tsx` cases: asserts the manifest table sits inside `.table-scroll`, and that the manifest heading/rows render) |
| Frontend build | `npm run build` | succeeds, main chunk 786.26 kB (same pre-existing >500kB warning, not a regression) |

**Deployment:** committed and pushed to `origin/main`, then redeployed to
Vercel production from `web/` (same linked project,
`chinny070s-projects/web` / `prj_fbSU6AI5aDFOfiC9FyPlldOHPzZ5`, same stable
alias `https://web-omega-amber-37.vercel.app`) — see the commit hash and
deployment ID recorded in the git history and Vercel dashboard for this
change. The live public URL was re-checked after deploy with the same
JS-based `scrollWidth`/`clientWidth` measurement (not a visual check) to
confirm Adapter Foundry at 375px no longer overflows on the actual
production build, not just the local one.

### Wallet verification — honest status and manual checklist

**UPDATE 2026-10-14, later same day — see section 12 below: wallet
connection is now CONFIRMED WORKING, live, by the user with real
MetaMask.** Everything below this line describes this agent's own
(unsuccessful, by design — no agent here has ever held a signing key)
attempt to verify wallet behavior from within its own browser tooling,
and is kept as an accurate record of that limitation rather than rewritten
— it was superseded by the user's own real test, not by anything this
agent did.

**UNVERIFIED in this agent's own session — no injected wallet provider available.**
Checked rigorously, not assumed: the Claude Browser pane
(`mcp__Claude_Browser__*`) is the only browser this agent drove against
the live site, and it is an isolated, headless context with no persistent
wallet extension — `window.ethereum` is `undefined` there, exactly as in
every prior pass. A second browser-automation tool surface,
`mcp__claude-in-chrome__*` (which can in principle drive the user's real
Chrome, with their real extensions), was also available as a tool
*schema* in this session, but calling `list_connected_browsers` returned
an **empty list** — no actual Chrome instance (with or without a wallet
extension) is connected to this account in this session. So neither
browser surface gives this agent a real EIP-1193 provider to test against,
and nothing about wallet connectivity is fabricated or simulated as a
result — this is a genuine tooling gap, not a product gap, and it matches
this project's absolute, unchanged boundary: no agent has ever held or
used a StudioNet signing key.

Manual verification checklist for the user (run in your own browser, with
your own wallet extension — MetaMask or similar — installed):

1. Open `https://web-omega-amber-37.vercel.app` in a normal (non-incognito)
   browser window where your wallet extension is installed and unlocked.
2. Go to Settings and confirm it reports your wallet as "Not connected"
   before you click anything — this should never show a false "Connected"
   state on page load.
3. Click the connect-wallet control. Your wallet extension should prompt
   you to approve the connection (a real EIP-1193 `eth_requestAccounts`
   request) — approve it.
4. Confirm the UI now shows your real connected address (or a truncated
   form of it) and a "Connected" state that matches your extension's own
   "Connected" indicator for this site.
5. Check the network/chain indicator. If your wallet is not on StudioNet
   (chain id `61999`), confirm the app shows a clear, honest
   network-mismatch message rather than silently proceeding as if it were
   on the right chain — switch networks in your wallet if prompted and
   confirm the app's state updates accordingly.
6. Perform exactly one safe, read-only action while connected — e.g. open
   Agent Atlas and look up your own connected address's passport, or open
   Protocol Telemetry — and confirm it renders real chain data (matching
   the live counts documented in section 10 above) without requiring or
   triggering any transaction prompt.
7. Do **not** click "Create agreement," "Submit evidence," "Authorize
   settlement," or any other write action unless you specifically intend
   to send a real StudioNet transaction and are prepared for your wallet
   to prompt you to sign and pay gas for it — every write-path button is
   gated behind a real `disabled` attribute until connected, by design,
   and clicking through on a connected wallet will attempt a genuine
   signed transaction, which is outside this verification's scope.
8. Disconnect (via your wallet extension or the app's own disconnect
   control, if present) and confirm the UI honestly returns to "Not
   connected" rather than staying in a stale "Connected" state.

No step above was performed by this agent; this checklist exists because
it could not be.

## 12. Real finding from the user's own manual wallet test (2026-10-14) —
confirmed root cause, fixed, and a genuine SDK constraint documented

The user actually ran the manual checklist above with **Rabby Wallet**
installed, and it surfaced two real, distinct bugs — not a single issue:

1. **Error-message bug (fixed, commit `290e414`).** The failure rendered
   as `"Wallet is connected but could not be switched to StudioNet (chain
   61999): [object Object]"`. Root cause: six call sites across
   `chain/client.ts`, `chain/schema.ts`, `chain/transactions.ts`,
   `hooks/useContractRead.ts`, and `state/WalletContext.tsx` used
   `err instanceof Error ? err.message : String(err)`, which degrades to
   JavaScript's default object stringification for any non-`Error` throw.
   EIP-1193 provider errors are commonly plain `{code, message}` objects,
   not `Error` instances, so every one of these sites silently discarded
   the real reason. Fixed with a shared `describeError()` helper
   (`chain/client.ts`) that extracts `.message` (with the error code
   appended) before falling back to `JSON.stringify`. Covered by 4 new
   regression tests.

2. **Real underlying SDK constraint (now explicitly handled, commit
   `4590303`).** With the error
   message now readable, the actual failure read: `"method
   [wallet_getSnaps] doesn't have corresponding handler (code -32601)"`.
   Confirmed by reading `node_modules/genlayer-js/dist/index.js`'s own
   `connect()` implementation directly (not guessed): `genlayer-js@1.1.8`'s
   wallet-connect flow does the generic `wallet_addEthereumChain` /
   `wallet_switchEthereumChain` dance and then **unconditionally** calls
   `wallet_getSnaps` to check for, and auto-install if missing, a
   GenLayer-specific MetaMask Snap plugin (`npm:genlayer-wallet-plugin`,
   via `wallet_requestSnaps`). `wallet_getSnaps`/`wallet_requestSnaps` are
   **MetaMask-proprietary RPC methods**, not part of the EIP-1193
   standard. Rabby Wallet (and, by the same mechanism, other
   MetaMask-mimicking extensions such as Coinbase Wallet or Brave's
   built-in wallet) implements the standard EIP-1193 surface faithfully
   but does not implement MetaMask's Snaps API, so this call fails with a
   standard JSON-RPC `-32601 Method not found` error.

   **This means `genlayer-js@1.1.8`'s documented wallet-connect path
   genuinely requires the real MetaMask browser extension specifically**
   — not "any EIP-1193-compatible wallet" as the product spec's "supported
   injected-wallet integration" language might otherwise suggest. This is
   a confirmed, previously-unverified constraint of the pinned SDK version,
   discovered through real user testing, not assumed or guessed.

   **Fix applied:** `connectWallet()` in `chain/client.ts` now proactively
   probes `wallet_getSnaps` immediately after requesting accounts, *before*
   calling into `genlayer-js`'s own `connect()`. If the probe fails with a
   recognizable "method not found" shape, the user now sees one clear,
   specific, actionable message — *"This wallet does not support MetaMask
   Snaps, which genlayer-js requires for StudioNet... Install and use the
   official MetaMask extension instead"* — instead of a cryptic RPC error
   surfacing deep inside the SDK's own flow (potentially after the wallet's
   active chain has already been changed, leaving it half-switched). An
   unrecognized failure from the probe itself is still surfaced honestly
   (`"Could not check wallet Snap support: ..."`) rather than
   misdiagnosed as the Snaps issue specifically. Covered by 2 new
   regression tests reproducing the exact Rabby failure shape and the
   honest-fallback path.

   **Confirmed live by the user, 2026-10-14, same day as the fix.** The
   user installed/switched to the real MetaMask extension and reported a
   successful wallet connection on the live production site
   (`https://web-omega-amber-37.vercel.app`, deployment `dpl_8uLkNrPP
   5HMTuXjtsJxRbpTDLF9w`) — the first genuinely confirmed, real wallet
   connection in this project's history, by the user themselves since no
   agent in this project has ever held a signing key. This closes the
   loop opened in section 11 above: wallet connection is no longer
   UNVERIFIED, it is **CONFIRMED WORKING with real MetaMask**. The
   `wallet_getSnaps` probe added in commit `4590303` was not strictly
   exercised as a failure path in this specific successful connection
   (real MetaMask supports Snaps, so the probe would have passed
   silently) — its value is specifically for a user who, like this one
   initially did, tries to connect with Rabby or a similar wallet first;
   that failure path itself remains verified only by the 2 regression
   tests in `web/src/chain/client.test.ts`, not by a second live
   re-attempt with Rabby after the fix. Still untested live: an actual
   signed write transaction through the deployed frontend (creating an
   agreement, submitting evidence, etc.) — the connection succeeding is
   necessary but not sufficient evidence for that; it remains the next
   real verification step if the user chooses to pursue it.
