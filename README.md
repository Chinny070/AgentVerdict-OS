# AgentVerdict OS

> The universal accountability layer for autonomous work. Natural-language
> agreements become evidence-backed, challengeable, settlement-authorizing
> decisions on GenLayer.

Full product and protocol authority: `AGENTVERDICT_OS_PRODUCT_PROTOCOL_DESIGN_SPEC.md`.
Full build brief: `AGENTVERDICT_OS_CODING_AGENT_MASTER_BUILD_BRIEF.md`.
Honest, precise current status: `docs/SUBMISSION_READINESS_REPORT.md`
(PASS/PARTIAL/BLOCKED per area, not a single "production ready" claim).

**Architecture:** one GenLayer Python Intelligent Contract
(`contracts/agentverdict.py`) plus a static frontend (`web/`). No backend
server, no hosted database, no relayer — see `docs/PROTOCOL_ARCHITECTURE.md`.

## Live deployments

| | Address | Status |
|---|---|---|
| **V2 (current)** | `0xCC67216ceD224A971739bAA706142A740B31853C` | Active, Stage-6-fixed (challenge-timeout recovery + storage-pickling fix). Every one of its 28 public write methods has been exercised at least once via real signed transactions. This is the frontend's default target. |
| V1 (historical) | `0xb222305575ee8af1255d8aCd196280b405B54Baf` | Superseded, read-only. Two finalized agreements (`A-1`, `A-2`) kept as historical evidence. Does **not** have the Stage 6 fixes. Remains fully queryable — never hidden or deleted — via the Settings screen's "Fill in V1 address" option. |

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
- **81/81 passing direct-mode tests** (`tests/direct/`) against the real
  downloaded pinned GenVM SDK (v0.2.16) — not a hand-written stub.
- A clean `genvm-lint check` pass (0 errors, 1 informational warning about
  a newer runner being available).
- A full React + TypeScript + Vite frontend (`web/`), `genlayer-js@1.1.8`
  pinned, 14 screens (Landing, Command Deck, Agreement Forge, Agent Atlas,
  Mission Control, Evidence Observatory, Verdict Theater, Appeals Tribunal,
  Recovery Center, Settlement Ledger, Adapter Foundry, Simulation Chamber,
  Protocol Telemetry, Settings), typechecked, unit-tested (20/20 passing),
  production-built, defaulting to the live V2 contract, and browser-verified
  against real V2 chain reads with zero console errors across every screen
  and no mobile horizontal overflow.
- Two real, independent StudioNet deployments (table above) with an
  exhaustive live-call-by-call verification history.

## What is honestly not yet proven

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
3. The app defaults to the live V2 contract already — no address entry
   needed to browse read-only screens (Protocol Telemetry, Agent Atlas,
   Evidence Observatory, Verdict Theater, Appeals Tribunal, Settlement
   Ledger all work immediately).
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
# show real live V2 chain data immediately, no setup required.
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
