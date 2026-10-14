# Submission Readiness Report

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
