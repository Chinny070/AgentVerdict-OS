# AGENTVERDICT OS — AUTONOMOUS CODING AGENT MASTER BUILD BRIEF
**Version:** 1.0 | **Target:** real StudioNet implementation | **Repo:** existing repository if supplied; otherwise create a single monorepo

> YOU ARE THE IMPLEMENTING CODING AGENT. Your job is to deliver a working, tested, verifiable GenLayer project, not merely plans, mocked screens, pseudocode, or an untested prototype.

## 0. Mission and success criteria
Build **AgentVerdict OS**, a universal intelligent evaluation and adjudication protocol with AI-agent coordination as the first end-to-end application. Implement **frontend + GenLayer Python Intelligent Contract(s) ONLY**. The contract must make real GenLayer-native semantic decisions on public evidence under frozen rubrics, support appeals and authorized settlement outcomes, and expose a premium responsive frontend. Include all 40 distinctive features in the feature ledger, implementing P0 completely, P1 where feasible after P0 is proven, and P2 only when feasible without violating architecture. Never mislabel a deferred capability as working.

**Mandatory reference document:** `AGENTVERDICT_OS_PRODUCT_PROTOCOL_DESIGN_SPEC.md` in this handoff. Treat it as the product and design authority, subject to verified runtime reality. If a requirement conflicts with official current GenLayer support, record the conflict, implement the safest verified subset, and clearly report the gap.

## 1. NON-NEGOTIABLE BOUNDARIES
- ONLY GenLayer on-chain Intelligent Contract(s) and a static frontend. No backend server, no Supabase, Firebase, Fly.io, managed database, GraphQL service, serverless function, cron worker, privileged relayer, or secret-bearing proxy.
- No fake chain activity, simulated receipts disguised as real, fabricated LLM decisions, pretend escrow, imaginary deployment or wallet connection.
- Target **StudioNet**, **chain ID 61999**, RPC candidate **`https://studio.genlayer.com/api`**, **`genlayer-js@1.1.8`** pinned, injected wallet through verified GenLayerJS SDK. Confirm these details against live official documentation/CLI before coding and record differences. StudioNet is gasless; 0 GEN balance is normal.
- Contracts in Python, `gl.Contract`, correct pinned GenVM Depends header, official storage types; no persisted raw Python `dict` or `list`.
- Do not use `genlayernode` for app development; it is for validator-node operations.
- Keep privileged secrets off-chain and out of the frontend. Public evidence only; sensitive evidence must remain off-chain and is not automatically private just because hashed.
- If a feature inherently requires a hosted service (push webhooks, secret-bearing API, 24/7 automation), provide a client-only honest alternative and document its limitations. DO NOT quietly add a backend.

## 2. Install / verify official GenLayer skills and documentation FIRST
Official skills: https://skills.genlayer.com/
For Claude Code:
```text
/plugin marketplace add genlayerlabs/skills
/plugin install genlayer-dev@genlayerlabs
```
Read and apply:
1. `write-contract` BEFORE contract design and throughout implementation: GenVM storage, runner dependencies, validators, LLM resilience, web, equivalence and anti-patterns.
2. `genvm-lint` AFTER EVERY contract modification.
3. `direct-tests` for state machine, authorization, mock LLM/web.
4. `integration-tests` for real consensus, LLM/web and StudioNet.
5. `genlayer-cli` for accounts, network, deploy, schema, read/write, receipts/traces.

If MCP supported:
```bash
claude mcp add genlayer-docs --transport sse https://docs-mcp.genlayer.com/sse
claude mcp add genlayer npx -- -y genlayer-mcp
```
Use Docs MCP to verify exact APIs and examples. If unavailable, consult:
- https://docs.genlayer.com/full-documentation.txt
- https://sdk.genlayer.com/main/_static/ai/api.txt
- https://github.com/genlayerlabs/genlayer-project-boilerplate
- https://gym.genlayer.foundation
- https://intelligentoracle.com

Install as appropriate:
```bash
npm install -g genlayer
pip install genvm-linter
pip install 'genlayer-test[sim]'
npm install genlayer-js@1.1.8
```
Use `genlayer-py` only if a verified, essential script requires it; **do not introduce a Python backend**. Pin reproducible dependencies and lockfiles.

**Documentation audit artifact:** `docs/GENLAYER_CAPABILITY_MATRIX.md` containing exact verified APIs, version, links, unsupported assumptions, network settings, storage patterns, consensus patterns, wallet injection mechanism, asset custody capability, and SDK compatibility. Do not invent methods.

## 3. GenLayer mental model (must follow)
GenLayer is a protocol/blockchain for trustless adjudication, not just an ordinary EVM or a synonym for Intelligent Contracts. GenLayer Chain is an EVM-compatible L2 for accounts, balances and Ethereum-style operations; GenVM executes Python Intelligent Contracts with LLM and public web/unstructured evidence access. Optimistic Democracy involves a leader proposal, independent validator evaluations, challenge/appeal and finality. Define validator equivalence for every nondeterministic result; a simple byte-for-byte comparison is insufficient for variable semantic output.

Use `strict_eq` only for exactly reproducible normalized outputs. For live web, LLM reasoning, fuzzy scores and unstable API fields, implement custom leader/validator logic following **verified** docs. Document criterion-level equivalence and uncertainty. Do not assume validator agreement proves factual truth.

## 4. Work mode
You have authority to create and modify code, docs, tests, design assets, deployment records and static frontend within the project folder. Inspect existing files and git status first; preserve working functionality. Do not push to a remote unless a real remote is configured and push is explicitly authorized. Never invent addresses, hashes, transactions, successful tests or audit conclusions. Execute tools, fix errors, retest, and finish with evidence.

### Working order
1. Inspect repository, README, lockfiles, git status, existing contracts and tests.
2. Verify GenLayer official SDK/CLI APIs, chain details, consensus and asset handling.
3. Create architecture, data model, threat model, equivalence decisions and acceptance matrix.
4. Implement minimal end-to-end real contract path first.
5. Run lint/direct tests; then integration tests; fix failures.
6. Deploy to StudioNet if access exists; inspect schema and receipts.
7. Wire actual deployed schema into frontend; connect injected wallet.
8. Implement visual system and every required P0 UI workflow.
9. Add P1 functionality in priority order, then honest P2 scaffolding.
10. Run comprehensive gates and produce final audit/handoff.

## 5. Suggested repository layout (adapt to verified tooling)
```text
agentverdict-os/
  contracts/
    agentverdict.py
    modules/
      api_delivery.py
      agent_task.py
      evaluation_schema.py
  tests/
    direct/
      test_state_machine.py
      test_access_control.py
      test_evidence.py
      test_api_delivery.py
      test_agent_task.py
      test_disputes.py
      test_settlement.py
      test_reputation.py
      test_adversarial.py
    integration/
      test_full_agent_lifecycle.py
      test_consensus_equivalence.py
      test_web_evidence.py
      test_challenge_finality.py
  web/
    src/
      app/
      components/
      features/
        agreements/
        agents/
        evidence/
        verdicts/
        appeals/
        settlement/
        developer/
      chain/
        client.ts
        config.ts
        contract.ts
        schema.ts
        transactions.ts
      design/
        tokens.css
        global.css
      main.tsx
    package.json
    vite.config.ts
  deployments/
    studionet.json
  docs/
    GENLAYER_CAPABILITY_MATRIX.md
    PROTOCOL_ARCHITECTURE.md
    STATE_MACHINE.md
    EQUIVALENCE_MATRIX.md
    SECURITY_THREAT_MODEL.md
    FEATURE_IMPLEMENTATION_LEDGER.md
    ACCEPTANCE_MATRIX.md
    TEST_EVIDENCE.md
    DEPLOYMENT_RUNBOOK.md
    FINAL_HANDOFF.md
  AGENTVERDICT_OS_PRODUCT_PROTOCOL_DESIGN_SPEC.md
  README.md
```
**Important:** Contract module splitting and imports must follow verified GenVM compatibility. If importing custom Python modules is unsupported, consolidate safely into a single contract and keep helpers in supported locations. Do not force a conventional Python package structure onto GenVM.

## 6. Contract architecture and invariants
Implement:
- On-chain module registry with versioned immutable manifests (or safely static initial modules if dynamic registry unsupported).
- Versioned policy/rubric references frozen at acceptance.
- Agreement and milestone lifecycle with explicit legal transitions.
- Scoped agent identity, acceptance, delegation, revocation, spending caps.
- Evidence registration: bounded source references, hash, claimed MIME type, submitter, timestamps, criterion mapping, freshness metadata.
- Evaluation attempts with snapshot references, structured criterion findings, source citations, uncertainty, error status.
- Provisional verdict and application challenge window; distinguish from underlying GenLayer consensus/finality.
- Challenge standing, deadlines, grounds, new evidence policy, deterministic appeal state.
- Recovery/rework and partial-completion paths.
- Authorized settlement receipts; real funds only if verified native mechanisms safely support them.
- Reputation events only from finalized, attributable outcomes.
- Audit receipts and read-only methods for UI.

**State transition table required:** from-state, action, actor, guards, to-state, events, invariants, negative tests.

**Money:** use sized integer values and explicit units, checked bounds, no floats. Enforce recipient, balance, max payout, idempotency, no double settlement. Never promise real escrow if not proven.

**Evidence:** limit URL schemes and length, reject private/unsupported endpoints if relevant, bound redirects/response size per supported APIs, reject duplicates/replays, do not follow instructions found in untrusted content.

**Structured LLM output:** request JSON, validate every field, normalize allowed aliases, cap strings, classify deterministic errors `EXPECTED`, `EXTERNAL`, `TRANSIENT`, `LLM_ERROR`, and fail safely with `INSUFFICIENT_EVIDENCE` where appropriate.

## 7. Evaluation module contract
Every evaluation module MUST specify:
- stable `module_id` and immutable version;
- input evidence types and source accessibility;
- rubric/criterion schema and weights or deterministic gates;
- exact output schema and allowed decisions;
- source retrieval and snapshot/freshness policy;
- leader and validator equivalence algorithm;
- behavior on contradictions, missing sources, timeouts and model failure;
- cost/resource bounds;
- security/abuse tests;
- human-readable explanation and evidence citations.

### Module 1: API Delivery
Support agreement rubric, endpoints, methods, expected status codes, response shape, auth behavior if publicly testable, error cases, documentation, evidence from public GitHub repo/live API/public test output. Verify reproducible properties deterministically where feasible. If no secure authenticated access exists, mark private requirements unverified. Record PASS / PARTIAL / FAIL / INSUFFICIENT_EVIDENCE and criterion-level citations.

### Module 2: AI-Agent Task
Support task description, expected outputs, format, scope, constraints, deadlines, public evidence and delegation lineage. Verify submitted results against frozen rubric. Distinguish quality judgment from objective metadata. Provide uncertainty and partial completion. Handle multi-agent failures conservatively; do not fabricate causality.

## 8. Feature delivery ledger — all 40 MUST be accounted for
Create `docs/FEATURE_IMPLEMENTATION_LEDGER.md` with one row for each feature, including priority, files, tests, UI entry, real chain behavior, limitations and verified status.

**P0 / initial real path:**
2 Proof-of-Work Quality Engine; 4 Constitutional Agreement Engine; 5 Autonomous Recovery Engine; 6 Evidence Authenticity Firewall; 9 Contradiction Detection Engine; 13 Evidence Freshness Monitor; 15 Verdict Explanation Graph; 16 Agent Identity/Capability Passport; 18 Delegation Accountability; 19 Spending/Permission Firewall; 26 Verifiable Verdict Receipts; 30 Versioned Evaluation Modules; 32 Contract Observability Dashboard; 35 Anti-Prompt-Injection Evidence Gateway; 38 Appeals/Reconsideration; 39 Settlement Safety Vault (or honestly disabled if unsupported).

**P1 / build after proven P0:**
1 Counterfactual Verdict Simulator; 3 Multi-Agent Causality Engine; 7 Source Reliability Graph; 8 Semantic Agreement Compiler; 10 Adversarial Evidence Testing; 11 Evaluation Consistency Monitor; 14 Dynamic Risk Classification; 17 Agent-to-Agent Negotiation; 22 Universal Evaluation Adapter SDK; 24 Policy Template Marketplace; 25 Modular Evidence Connectors; 27 Cross-Application Reputation; 31 Developer Sandbox; 34 Evaluation Cost Estimator; 36 Evidence Commitment/Reveal; 37 Privacy-Preserving Evidence Registry; 40 Sybil-Resistant Reputation.

**P2 / carefully bounded future:**
12 Precedent Intelligence Engine; 20 Agent Collusion Detection; 21 Agent Reliability Forecasting; 23 Evaluation-as-a-Service API (**client SDK direct chain, no hosted API**); 28 Batch Evaluation Engine; 29 Event-Driven Automation (**client-driven only**); 33 Webhook/Event Subscription (**client subscriptions only, no webhook server**).

If implementing P1/P2 requires unverified runtime support, record an explicit blocker. Do not replace real P0 flows with shallow mock implementations just to check all 40 boxes.

## 9. Premium frontend: do not build a generic admin template
Implement the product spec's **iridescent forensic futurism** system:
```css
:root {
  --void: #07040E;
  --nebula: #210B38;
  --plasma: #8B3DFF;
  --chartreuse: #D7FF3F;
  --cyan: #35F5FF;
  --coral: #FF557F;
  --tangerine: #FF9A35;
  --opaline: #E7D9FF;
  --white: #F7F5FF;
  --carbon: #171427;
  --mint: #50FFB1;
  --magenta: #D629FF;
  --spectral: linear-gradient(112deg,#8B3DFF 0%,#D629FF 27%,#35F5FF 63%,#D7FF3F 100%);
}
```
Original visual direction: editorial asymmetric hero, orbital evidence constellations, spectral strokes, near-black layered glass, luminous decision chips, bold typographic hierarchy, precise technical tables, expressive empty states, restrained motion. No generic purple SaaS boilerplate. Responsive mobile-first layout; WCAG 2.2 AA target, accessible keyboard and reduced-motion UX.

Implement functional routes/screens:
1. Landing / protocol explanation with truthful capabilities.
2. Command Deck / dashboard.
3. Agreement Forge / create, preview, freeze, accept.
4. Agent Atlas / identities and delegations.
5. Mission Control / milestones and submission.
6. Evidence Observatory / sources and provenance.
7. Verdict Theater / criterion findings and proof.
8. Appeals Tribunal / challenge and finality.
9. Recovery / remediation and partial settlement.
10. Settlement Ledger / authorized vs executed clearly differentiated.
11. Adapter Foundry / developer documentation.
12. Protocol Telemetry / actual chain-derived data.
13. Settings / network diagnostics.
14. Simulation Chamber / clearly advisory simulations.

Each screen must have working navigation, realistic empty/error/loading states, real chain data when available, and explicit `Experimental` or `Coming later` labels for deferred capabilities. Never seed a fake transaction feed presented as real.

## 10. Wallet + chain integration
- Pin `genlayer-js@1.1.8`.
- Confirm official `createClient`, chain configuration, `readContract`, `writeContract`, receipts/status APIs and injected wallet integration using docs or source for **this version**. Do not guess signatures.
- Verify network ID 61999 and RPC `https://studio.genlayer.com/api` at runtime/docs; if SDK built-in StudioNet differs, prefer documented supported configuration and explain.
- Distinguish read/view from write/transaction calls. Show wallet approval, submitted hash, pending, consensus/appeal phase, finalized, failed.
- Never derive canonical state from localStorage. Use contract schema from actual deployed address.
- Show connection errors, wrong network, no injected provider, rejected signature, unavailable RPC, receipt timeout and retry advice.
- Centralize address/ABI/schema and chain metadata in typed config; no hardcoded fabricated address.
- Use browser direct RPC; if browser CORS or injected wallet limitation prevents a feature, document the exact limitation rather than inserting a proxy backend.

## 11. Required tests and acceptance scenarios
### Direct tests
- legal transitions for every state and rejection of all illegal transitions;
- authorization, ownership, delegate expiration, revocation, spending cap;
- rubric frozen after acceptance, module version binding;
- invalid/oversized/duplicate evidence and source spoofing;
- structured LLM output: malformed JSON, aliases, wrong types, contradictory result;
- missing/changed/unreachable API, stale source, false citation;
- API module success/partial/fail/insufficient;
- agent module success/partial/fail/insufficient;
- challenge eligibility, deadline, replay, finalization;
- rework and partial completion;
- settlement idempotency, wrong recipient, overflow and double payment;
- reputation only on finalized outcomes;
- malicious prompt injection payloads in evidence;
- invariant/property tests if feasible.

### Integration tests
- GenVM execution with real/mocked supported consensus pattern;
- validator equivalence on semantically similar but textually different explanations;
- live public web/API retrieval where network permits;
- actual agreement → evidence → provisional verdict → challenge/finalize lifecycle;
- real StudioNet deployment and schema reads/writes;
- wallet interaction and transaction status transitions;
- accurate finality semantics.

### Frontend tests
- TypeScript typecheck, production build, component tests;
- browser flows for injected wallet, network mismatch, rejected transaction;
- real contract reads and write status;
- accessible keyboard focus, mobile viewport, reduced motion;
- no server calls to unapproved custom backend;
- all navigation and feature status badges accurate.

## 12. Mandatory quality gates
After EVERY contract change:
```bash
genvm-lint check contracts/agentverdict.py --json
```
Also lint every additional contract file individually. Fix ALL actionable lint errors before tests. Then:
```bash
pytest tests/direct/ -v
gltest tests/integration/ -v -s
```
Run integration tests only once direct tests pass, and clearly distinguish unavailable environment from a passing suite. Use actual configured commands from the verified skills if version-specific syntax differs.

Frontend:
```bash
cd web
npm ci
npm run typecheck
npm run test -- --run
npm run build
```
Adjust scripts only if the real package.json differs; define meaningful scripts, do not create fake no-op success commands.

Deploy/debug using verified CLI:
```bash
genlayer network set studionet
genlayer deploy ...
genlayer schema <address>
genlayer call ...
genlayer write ...
genlayer receipt <txHash> --stdout --stderr
genlayer code <address>
```
Ellipses are placeholders; derive exact command flags from `genlayer --help` and official docs. For built-in networks use `genlayer network set` rather than manually overriding RPC. Record source hash, deployed address, chain ID, schema and tx IDs in `deployments/studionet.json` only after verifying. StudioNet 0 GEN is expected; Bradbury/Asimov require funded test accounts and browser faucet interaction at https://testnet-faucet.genlayer.foundation/.

On failed transaction, inspect receipt stdout/stderr, schema, deployed code and read state BEFORE changing contract logic.

## 13. Phase-by-phase implementation contract
### STAGE 0 — Source verification and architecture
Deliver `GENLAYER_CAPABILITY_MATRIX.md`, `PROTOCOL_ARCHITECTURE.md`, `STATE_MACHINE.md`, `EQUIVALENCE_MATRIX.md`, `SECURITY_THREAT_MODEL.md`, `ACCEPTANCE_MATRIX.md`, initial feature ledger. Include verified sources and version constraints.

### STAGE 1 — Core contract
Deliver deployable storage, policy/module registry, agreement lifecycle, agent identity, delegation, permissions, evidence metadata. Lint and direct tests green.

### STAGE 2 — Actual intelligent evaluation
Implement both modules fully, with bounded JSON, evidence access, custom equivalence, error classification and verdict receipts. No placeholder AI function. Lint, direct and integration tests.

### STAGE 3 — Adjudication and settlement
Challenge window, reconsideration, recovery, finalization, authorized settlement, reputation. Validate deterministic safety and actual asset support.

### STAGE 4 — StudioNet + frontend
Deploy real contract where access exists, capture schema, integrate wallet and all P0 screens. No backend. Distinct transaction/finality states.

### STAGE 5 — Differentiation
Implement P1 features in the order: agreement compiler, simulator, causality, source graph, negotiation, template registry, adapters, privacy commitments, anti-gaming and developer sandbox. Every addition must pass prior gates.

### STAGE 6 — Hardening and handoff
Threat-model validation, full acceptance matrix, test evidence, responsive UX review, deployment proof, clear open gaps and honest readiness verdict.

## 14. Stop conditions and truthful fallbacks
If official GenLayer support differs from this brief, prioritize verified documentation and explain. If network, Docker, GenVM runtime, LLM provider, wallet, test account, browser or permissions are missing, do not claim success. Record:
- exact blocker and failed command;
- what has been implemented and tested locally;
- minimum next manual step/command;
- affected acceptance cases;
- whether deployed functionality remains unverified.
Do not silently swap GenLayer with EVM-only Solidity, off-chain LLM APIs, a fake consensus engine, a hosted database, or a custodial backend.

## 15. Deliverable artifacts and final report
Must leave in repo:
- complete source code and lockfiles;
- full specification, architectural decisions and all 40-feature ledger;
- working real contract and two flagship evaluation modules;
- direct/integration/frontend tests and outputs;
- deployment configuration with verified address or explicit blocker;
- typed GenLayerJS integration and responsive design system;
- `.env.example` containing only public config and safe placeholders;
- `README.md` with reproducible setup and demonstration;
- `docs/FINAL_HANDOFF.md` with actual commands/results, source hash, contract address, transaction receipts, known limitations, security caveats, and readiness status.

**Final agent response format:**
1. Delivered and actually working.
2. Files changed and architectural decisions.
3. Lint/direct/integration/frontend test results (exact counts or blocked).
4. StudioNet address, chain ID, deployment tx, schema verification, example receipts (only if real).
5. P0/P1/P2 feature completion ledger and deferred limitations.
6. Security findings and settlement support status.
7. Reproduction steps and next concrete actions.
8. Explicit verdict: READY / CONDITIONALLY READY / BLOCKED — never unconditional READY without verified end-to-end tests.

## 16. Absolute final instruction
DO NOT stop after planning. Implement and verify as far as your environment permits. Favor one genuinely working GenLayer adjudication lifecycle and both real flagship evaluation modules over dozens of mockups. Keep every interface honest, every irreversible action guarded, and every claim backed by a test, chain receipt, or explicit limitation.
