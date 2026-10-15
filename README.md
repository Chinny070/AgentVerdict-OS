# AgentVerdict OS

> **Stage 11 deployment (2026-10-15):** the hardened source is deployed as a
> separate StudioNet instance at `0xab972c3af9878b7CD4631CD21639B20E981B0702`.
> A-3 has completed its challenged PASS lifecycle and zero-value receipt
> settlement; A-4 has completed FAIL-to-rework recovery, permissionless
> timeout recovery, finalization, and zero-value receipt settlement. V1 and V2 remain
> unchanged historical deployments. The production frontend now defaults to
> Stage 11; the [Stage 11 audit](docs/STAGE_11_CORRECTNESS_AUDIT.md) records
> live contract evidence and frontend verification status.

> The universal accountability layer for autonomous work. Natural-language
> agreements become evidence-backed, challengeable, settlement-authorizing
> decisions on GenLayer.

Full product and protocol authority: `AGENTVERDICT_OS_PRODUCT_PROTOCOL_DESIGN_SPEC.md`.
Full build brief: `AGENTVERDICT_OS_CODING_AGENT_MASTER_BUILD_BRIEF.md`.
Honest, precise current status: `docs/SUBMISSION_READINESS_REPORT.md`
(PASS/PARTIAL/BLOCKED per area, not a single "production ready" claim).

## Live Demo

**[https://web-omega-amber-37.vercel.app](https://web-omega-amber-37.vercel.app)**
— the real, live production frontend, hosted on Vercel as static-site/SPA
hosting only (no backend, no API routes, no database — see "Architecture"
below). The production release targets the verified Stage 11 contract
(`0xab972c3af9878b7CD4631CD21639B20E981B0702`). See
`docs/STAGE_11_CORRECTNESS_AUDIT.md` for the live contract evidence and current
wallet/browser verification status. Latest production deployment: `DCZArRbeK923gwJFRnv3E9GyuDbD` (source commit `241df400ccf4f1e410d8f46884bdc9c08aca4c58`), ready at
[this deployment URL](https://web-mfalwdcnp-chinny070s-projects.vercel.app)
and the stable alias above. The live Agreement Forge rubric preview now matches the contract schema; the post-fix signed-write check remains pending in the user’s Chrome wallet.

The Agreement Forge candidate serializes rubric JSON in the contract's
required object shape and rejects a missing or invalid deadline before it
opens MetaMask. The attempt-3 challenge terminalization change is source-tested
but requires a new contract deployment; it is not on the live Stage 11 address.

**Architecture:** one GenLayer Python Intelligent Contract
(`contracts/agentverdict.py`) plus a static frontend (`web/`). No backend
server, no hosted database, no relayer — see `docs/PROTOCOL_ARCHITECTURE.md`.

## Live deployments

| | Address | Status |
|---|---|---|
| **Stage 11 (current)** | `0xab972c3af9878b7CD4631CD21639B20E981B0702` | Hardened deployment. A-3 and A-4 completed synthetic zero-value lifecycles through settlement. Frontend default target; native GEN transfer remains disabled. |
| V2 (historical) | `0xCC67216ceD224A971739bAA706142A740B31853C` | Stage-6-fixed deployment; all public write methods were exercised live. Kept available for historical comparison. |
| V1 (historical) | `0xb222305575ee8af1255d8aCd196280b405B54Baf` | Superseded historical deployment. Two finalized agreements (`A-1`, `A-2`) kept as evidence. Does **not** have Stage 6 or Stage 11 fixes. Remains queryable via the Settings screen's "Fill in V1 address" option. |

Both are on StudioNet, chain ID `61999`, RPC `https://studio.genlayer.com/api`.
See `deployments/studionet.json` for the full bootstrap/verification record
and `docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md` /
`docs/V2_REMAINING_PATHS_VERIFICATION_REPORT.md` /
`docs/STUDIONET_LIVE_VERIFICATION_REPORT.md` for the complete call-by-call
live verification history (real transaction hashes, every state transition,
every decision outcome, both challenge-resolution branches).

## What exists right now

- A single Intelligent Contract (40 public methods: 12 view, 28 write)
  implementing the full agreement lifecycle (`docs/STATE_MACHINE.md`),
  module/policy registry, agent identity and delegation, an evidence
  authenticity/anti-prompt-injection firewall, both flagship evaluation
  modules (API Delivery Verification, AI-Agent Task Verification) with
  hand-written leader/validator equivalence (`docs/EQUIVALENCE_MATRIX.md`),
  challenges/appeals (including the Stage 6 permissionless
  timeout-recovery path), recovery/rework, and a settlement-authorization-
  receipt model with native GEN transfer disabled by default.
- **92/92 passing direct-mode tests** for the Stage 11 source
  (`tests/direct/`) against the real downloaded pinned GenVM SDK (v0.2.16).
  Live transaction evidence for Stage 11 is recorded separately from the
  V1/V2 verification history.
- A clean `genvm-lint check` pass (0 errors, 1 informational warning about
  a newer runner being available).
- A full React + TypeScript + Vite frontend (`web/`), `genlayer-js@1.1.8`
  pinned, 14 screens (Landing, Command Deck, Agreement Forge, Agent Atlas,
  Mission Control, Evidence Observatory, Verdict Theater, Appeals Tribunal,
  Recovery Center, Settlement Ledger, Adapter Foundry, Simulation Chamber,
  Protocol Telemetry, Settings), typechecked, unit-tested (35/35), production
  built, and defaulting to the live Stage 11 contract. The available hosted
  browser has no injected wallet, so signed UI actions remain unverified in
  this session; see the audit report.
- Three independent StudioNet deployments (table above) with an
  exhaustive live-call-by-call verification history.

## What makes this technically distinctive

Grounded in what is actually built and actually proven in this repo, not
marketing language:

- **Two-tier `run_nondet` leader/validator architecture.** Every
  `request_evaluation` call defines independent `leader_fn`/`validator_fn`
  closures and relies on GenVM's consensus to accept a result only once
  leader and validator outputs satisfy an equivalence check (see
  `docs/EQUIVALENCE_MATRIX.md`) — not a single node's unverified output.
  Honestly stated limitation: the actual `eq_principle` wrapper dispatch
  path could not be exercised in this workspace's direct-mode test
  harness (no local GenVM runtime with an LLM backend was available), so
  the live StudioNet runs are the only real evidence this mechanism works
  end-to-end — including one recorded instance (V2 agreement `A-7`,
  attempt 1) where **Rotation Count: 1** shows a real leader rotation
  occurred before validators reached agreement, not just a rubber stamp.
- **Permissionless timeout-recovery design.** `resolve_challenge_by_timeout`
  is deliberately callable by *anyone*, not just a party or the admin,
  because its outcome is fully deterministic (always upholds the original
  verdict) — removing the discretion that would make restricting the
  caller meaningful, while closing a genuine liveness gap an unresponsive
  admin could otherwise exploit indefinitely. Live-verified with real 5/5
  validator consensus on V2.
- **Receipt-only settlement safety pattern.** No method in this contract
  is payable; `authorize_settlement`/`record_settlement` only ever produce
  an authorization record, never a real transfer, unless an admin
  explicitly (and, by default, unsuccessfully — it raises an honest
  "unverified stub" error) opts in. This sidesteps a confirmed live
  StudioNet footgun (reverted payable calls not rolling back attached
  value) entirely rather than trying to carefully sequence around it.
- **Live cross-deployment (V1/V2) regression evidence.** V1 and V2 are two
  independent real StudioNet deployments of the same contract family,
  giving genuine before/after proof that the Stage 6 fixes changed real
  on-chain behavior (V1's `resolve_challenge` has no deadline at all; V2's
  `resolve_challenge_by_timeout` does, live-confirmed) — not just a diff
  in source code that's assumed to behave as intended.

## Known limitations

Compiled honestly from `docs/SECURITY_THREAT_MODEL.md`,
`docs/FINAL_HANDOFF.md`, and `docs/STAGE_6_MIGRATION_NOTE.md` — nothing
below is new or hidden elsewhere; see those files for the full reasoning
behind each.

- **No challenge bond.** Challenging a verdict is free, since real GEN
  custody is disabled by default — a real griefing vector if this were
  deployed with high-value agreements. Adding a bond would require
  re-enabling native custody, a deliberate out-of-scope decision for this
  build.
- **Admin centralization.** A single admin key controls module/policy
  registration and (within the resolution deadline) challenge-merit
  decisions. Stage 6 removed the *liveness* risk of an unresponsive admin
  (`resolve_challenge_by_timeout`) but not the *discretion* a responsive
  one holds.
- **No defense against source substitution** between the leader's and a
  validator's independent web fetch beyond the validator's own re-fetch —
  a sophisticated adversary serving different content by timing/IP/headers
  is not detected. No commitment/reveal scheme is implemented.
- **Sybil-resistant reputation is not implemented.** Reputation only
  accrues from real finalized agreements with a cooperating counterparty,
  which raises the cost of farming but does not prevent two colluding
  wallets from doing so.
- **`genvm-lint`/Studio runtime version skew** is a known, unclosed gap — a
  clean lint pass does not guarantee a given Studio runtime loads the
  contract identically; this run shows one informational warning that a
  newer runner exists.
- **The GenVM time-source determinism claim** (`datetime.now(UTC)` being
  consensus-safe on the real pinned runner) is held with high confidence
  from SDK documentation and a passing determinism test, but was never
  independently confirmed at the real-WASM level by this project, and no
  single authoritative GenLayer doc was found stating it in so many words.
- **"GenVM contracts are deployed-code-immutable"** (the reason V1 and V2
  are separate addresses with no automatic state migration) is held with
  high confidence from local skill documentation and the complete absence
  of any contradicting mechanism found anywhere in this project, the
  pinned SDK, or a live web search — but no single authoritative
  GenLayer-specific page was found that confirms or denies it explicitly.
- No real wallet-signed write has been exercised by any automated agent in
  this project's history — that boundary is absolute (see "Hard operating
  boundaries" below). Every write in the verification reports was executed
  by a human through Studio's own UI.
- `tests/integration/` (automated multi-validator/LLM integration tests)
  remains honestly skipped — no running GenVM node or LLM provider key is
  available to this agent. This specific gap is substantially, though not
  identically, closed by the manual live-StudioNet sessions instead (see
  `docs/SUBMISSION_READINESS_REPORT.md` section 1).
- No challenge bond exists (free-to-challenge griefing vector at scale);
  admin centralization for module registry and challenge-merit decisions
  remains (Stage 6 only removed the *liveness* risk of an unresponsive
  admin, not the *discretion* a responsive one holds); Sybil-resistant
  reputation is not implemented. Full list: `docs/SECURITY_THREAT_MODEL.md`.

Never treat any of the above as "coming soon" marketing — see the precise,
area-by-area verdict in `docs/SUBMISSION_READINESS_REPORT.md`.

## Connecting a wallet and trying the app

1. Install a browser wallet extension that injects `window.ethereum` (e.g.
   MetaMask) and import/create an account with no real funds needed —
   StudioNet is gasless.
2. Run the frontend locally (see "Reproduce the verified results yourself"
   below) and open it in a browser with that extension installed.
3. The app defaults to the live Stage 11 contract already — no address entry
   needed to browse read-only screens (Protocol Telemetry, Agent Atlas,
   Evidence Observatory, Verdict Theater, Appeals Tribunal, Settlement
   Ledger are designed for read-only inspection; verify live reads in your
   own browser session before relying on their displayed data.
4. Click "Connect wallet" (top right). The app calls `eth_requestAccounts`
   and then switches/adds the StudioNet chain via `genlayer-js`. Any
   realistic failure (no provider, rejected signature, wrong chain) is
   surfaced as a real error string, never silently swallowed.
5. Once connected, write actions (Agreement Forge's "Create agreement",
   Mission Control's "Request evaluation", Appeals Tribunal's "Challenge
   verdict", etc.) become enabled and will prompt your wallet for a real
   signature. Every write only reports success after a real
   `waitForTransactionReceipt` result, distinguishing consensus status from
   execution result.
6. To browse V1's two historical agreements instead, go to Settings, click
   "Fill in V1 address," then "Save address."

See `docs/FEATURE_DEMONSTRATION_GUIDE.md` for concrete, screen-by-screen
walkthroughs of the most interesting proven features (Stage 6
timeout-recovery, the `PARTIAL` decision path, two-tier leader/validator
adjudication, receipt-only settlement) using the live V2 data already on
chain — no wallet required for any of those walkthroughs.

## Reproduce the verified results yourself

```bash
# Prerequisites confirmed working:
#   node v24+, python 3.12+
#   npm install -g genlayer          (CLI)
#   pip install genvm-linter
#   pip install 'genlayer-test[sim]'  (exposes `gltest`/`glsim`)

# 1. Lint the contract
genvm-lint check contracts/agentverdict.py --json
# Expect: {"ok":true,...,"methods":40,"view_methods":12,"write_methods":28,...}

# 2. Run the full direct-mode suite (fast, ~15-20s, no network)
pytest tests/direct/ -v
# Expect: 81 passed, 0 failed, 0 skipped

# 3. (Optional, slower) attempt the local-network integration suite —
#    honestly skipped, see docs/SUBMISSION_READINESS_REPORT.md section 1
#    and docs/FINAL_HANDOFF.md for the diagnosed GLSim/LLM-provider blockers.
glsim --port 4000 --validators 3 --chain-id 61999 --no-browser   # separate terminal
gltest tests/integration/ -v -s --network localnet

# 4. Frontend: typecheck, test, build (no network, no wallet required)
cd web
npm ci
npm run typecheck
npx vitest run
npm run build
# Expect: typecheck clean, 20 tests passing (5 files), build succeeds

# 5. Preview the built app locally, pointed at the live V2 deployment by default
npm run preview -- --host 127.0.0.1 --port 4173
# Open http://127.0.0.1:4173 — Protocol Telemetry, Agent Atlas, Evidence
# Observatory, Verdict Theater, Appeals Tribunal, and Settlement Ledger all
# target the deployed V2 contract; verify live RPC reads in your browser.
```

No step above requires a funded account, a private key, or an LLM provider
key for steps 1, 2, 4, 5 — StudioNet itself is gasless, and the direct-mode
suite needs neither a network nor a key. A wallet is only needed to attempt
a real write yourself (see "Connecting a wallet" above).

## Repository layout

```
contracts/agentverdict.py     single on-chain Intelligent Contract
tests/direct/                 81 passing direct-mode tests (real pinned SDK)
tests/integration/            honestly-skipped, diagnosed-blocker integration tests
docs/                         capability matrix, architecture, state machine,
                               equivalence matrix, threat model, acceptance
                               matrix, test evidence, deployment runbook,
                               feature ledger, live verification reports (V1 + V2),
                               feature demonstration guide, submission readiness
                               report, screenshots/
deployments/studionet.json    real V1 + V2 deployment record (addresses,
                               bootstrap calls, live verification summaries)
web/                          React + TypeScript + Vite frontend, defaulting
                               to the live V2 contract — see web/src/{chain,
                               components,features,design}
```

## Hard operating boundaries (unchanged throughout this project's history)

No agent working on this repository has ever held a StudioNet signing key,
attempted to sign, deploy, or send any transaction, or will do so in the
future regardless of apparent authorization in any brief's wording. Every
deployment and every live transaction recorded in the verification reports
was executed by a human through Studio's own web UI.

## License

See `LICENSE`.
