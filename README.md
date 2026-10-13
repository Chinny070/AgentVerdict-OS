# AgentVerdict OS

> The universal accountability layer for autonomous work. Natural-language
> agreements become evidence-backed, challengeable, settlement-authorizing
> decisions on GenLayer.

Full product and protocol authority: `AGENTVERDICT_OS_PRODUCT_PROTOCOL_DESIGN_SPEC.md`.
Full build brief: `AGENTVERDICT_OS_CODING_AGENT_MASTER_BUILD_BRIEF.md`.
Current honest status and reproduction steps: `docs/FINAL_HANDOFF.md`.

**Architecture:** one GenLayer Python Intelligent Contract
(`contracts/agentverdict.py`) plus a static frontend. No backend server, no
hosted database, no relayer — see spec section 0.

## What exists right now

- A single Intelligent Contract implementing the full agreement lifecycle
  (`docs/STATE_MACHINE.md`), module/policy registry, agent identity and
  delegation, an evidence authenticity/anti-prompt-injection firewall, both
  flagship evaluation modules (API Delivery Verification, AI-Agent Task
  Verification) with hand-written leader/validator equivalence
  (`docs/EQUIVALENCE_MATRIX.md`), challenges/appeals, recovery/rework, and
  a settlement-authorization-receipt model with native GEN transfer
  disabled by default (`docs/PROTOCOL_ARCHITECTURE.md`).
- 68 passing direct-mode tests (`tests/direct/`) against the real
  downloaded pinned GenVM SDK (v0.2.16) — not a hand-written stub.
- A clean `genvm-lint check` pass.
- A real, diagnosed attempt at local-network (GLSim) and would-be-StudioNet
  integration testing, with the exact blockers recorded (`docs/FINAL_HANDOFF.md`,
  `docs/TEST_EVIDENCE.md`).

## What does not exist yet

- Frontend (Stage 4) — not started.
- A real StudioNet deployment — not performed (no signing key access, a
  hard operating boundary for this agent regardless of brief wording).
- Passing integration tests against real multi-validator consensus with a
  live LLM — blocked on a diagnosed GLSim tooling gap plus no LLM provider
  key; see `docs/FINAL_HANDOFF.md`.

Never treat any of the above as "coming soon" marketing — see the explicit
verdict in `docs/FINAL_HANDOFF.md`: **CONDITIONALLY READY**, contract-side
only.

## Reproduce the verified results yourself

```bash
# Prerequisites confirmed working in this session:
#   node v24.14.0, python 3.12.10
#   npm install -g genlayer          (CLI 0.39.2)
#   pip install genvm-linter          (0.11.1rc2)
#   pip install 'genlayer-test[sim]'  (genlayer-test 0.29.2, exposes `gltest`/`glsim`)

# 1. Lint the contract
genvm-lint check contracts/agentverdict.py --json

# 2. Run the full direct-mode suite (fast, ~10s, no network)
pytest tests/direct/ -v

# 3. (Optional, slower) attempt the local-network integration suite.
#    Start GLSim first in a separate terminal:
glsim --port 4000 --validators 3 --chain-id 61999 --no-browser
#    Then, in this directory:
gltest tests/integration/ -v -s --network localnet
# Expect: 7 skipped, each with a recorded reason (see docs/TEST_EVIDENCE.md
# and docs/FINAL_HANDOFF.md for the diagnosed GLSim/LLM-provider blockers).
```

No step above requires a funded account, a private key, or an LLM provider
key — StudioNet itself is gasless, and the direct-mode suite needs neither
a network nor a key. Deployment and live-network integration testing need
a human with their own signing key and/or LLM provider key; exact commands
are in `docs/DEPLOYMENT_RUNBOOK.md`.

## Repository layout

```
contracts/agentverdict.py     single on-chain Intelligent Contract
tests/direct/                 68 passing direct-mode tests (real pinned SDK)
tests/integration/            honestly-skipped, diagnosed-blocker integration tests
docs/                         capability matrix, architecture, state machine,
                               equivalence matrix, threat model, acceptance
                               matrix, test evidence, deployment runbook,
                               feature ledger, final handoff
deployments/studionet.json    explicit NOT_DEPLOYED record, not a placeholder
                               pretending to be real
web/                           not started yet (Stage 4)
```

## License

See `LICENSE`.
