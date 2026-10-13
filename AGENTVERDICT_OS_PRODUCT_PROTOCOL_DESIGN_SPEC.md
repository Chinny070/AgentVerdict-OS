# AGENTVERDICT OS
## Product, Protocol & Experience Design Specification
**Version:** 1.0 | **Date:** 2026-10-13 | **Status:** Build specification, not proof of implementation

> **The universal accountability layer for autonomous work.** Natural-language agreements become evidence-backed, challengeable, settlement-authorizing decisions on GenLayer.

## 0. Immutable project boundaries

- **Architecture:** frontend + GenLayer Python Intelligent Contract(s) only. No custom hosted backend, Fly.io, Supabase, Firebase, serverless API, database service, or hidden privileged relayer.
- **Network target:** StudioNet, chain ID **61999**, RPC candidate `https://studio.genlayer.com/api`; confirm live configuration with official CLI/docs before using. Gasless StudioNet and 0 GEN balances are expected.
- **Client:** `genlayer-js` **1.1.8** pinned, injected wallet through its verified provider/client integration; do not invent SDK calls. A wallet with no supported injection must receive a clear actionable error.
- **Core:** GenLayer Chain + GenVM. Python `gl.Contract` Intelligent Contracts adjudicate semantic claims using explicitly designed validator equivalence, with deterministic state transitions and constraints.
- **Evidence:** public URLs, immutable hashes, public repository references, content-addressed artifacts, and user-provided text. No secrets or private uploaded files on-chain. Browser-local draft state only; all canonical state on-chain.
- **No fictional features:** features may be architected or demoed but must be labeled implemented, experimental, deferred, or blocked. No pretend consensus, payments, source verification, or zero-knowledge privacy.

## 1. Product thesis

Current marketplaces can transfer money, but cannot independently determine whether a multi-agent deliverable satisfied an agreed semantic rubric. AgentVerdict OS makes agreement formation, evidence evaluation, adjudication, corrective workflows, accountability, and settlement authorization reusable protocol primitives.

### Audiences and jobs
1. **Task sponsor:** specify verifiable outcomes, lock authorized value where supported, review verdicts and challenges.
2. **Executing agent:** accept scoped work, delegate under controlled conditions, submit evidence, request remediation.
3. **Evaluator / protocol integrator:** register bounded evaluation modules, query state, verify finalized receipts.
4. **Auditor / juror / challenger:** inspect provenance, challenge eligible decisions, verify historical rule versions.
5. **Developer:** integrate through typed GenLayerJS contract schema, event/state reads, and adapter definitions.

### Flagship demo
A sponsor creates an API implementation task with a frozen rubric; an agent accepts, optionally delegates; submits repository URL, live endpoint references, changelog and public test artifacts; the Intelligent Contract evaluates the evidence; a challenge period follows; a dispute or corrective cycle may occur; authorized settlement and reputation entries are finalized. Real public endpoints are evaluated only through supported GenVM web-access methods. Browser-side checks are supplemental and untrusted.

## 2. Product surfaces and information architecture

- **Command Deck:** wallet, network, live contract address, protocol health, active obligations, pending challenges.
- **Agreement Forge:** plain-language brief → suggested structured rubric → explicit human/agent approval → freeze; show unsupported clauses.
- **Simulation Chamber:** advisory counterfactual examples, expected decision branches, risk and cost warnings; NEVER promise future validator output.
- **Agent Atlas:** capabilities, verifiable histories, delegation links, bounded reputation, dispute context.
- **Mission Control:** task milestones, evidence packets, handoffs, recovery and settlement.
- **Evidence Observatory:** source graph, commitments, freshness, provenance, contradictions and visibility classifications.
- **Verdict Theater:** structured findings, accepted/rejected claims, criteria, cited evidence, uncertainty, transaction state.
- **Appeals Tribunal:** grounds, bond if supported, deadlines, challenge packets, decision history, finality.
- **Adapter Foundry:** adapter manifests, version compatibility, evaluation templates, integration examples.
- **Protocol Telemetry:** on-chain counters, latency estimated from chain observations, transactions, blocked operations, no fabricated metrics.
- **Settings / Diagnostics:** chain ID, wallet, deployment schema, explorer links, test mode, accessibility, reduced motion.

### Interaction principles
No fake 'AI is thinking' animation without a submitted transaction. Distinguish DRAFT / SUBMITTED / PENDING / PROPOSED / CHALLENGEABLE / FINALIZED / FAILED. Never display a pending verdict as final. Every semantic verdict includes a plain-English explanation and a machine-readable structured payload. Empty states teach the first real action. Every destructive action has a confirmation step.

## 3. Visual identity: unprecedented, expressive, yet usable

**Concept:** *Iridescent forensic futurism* — a high-contrast alien laboratory crossed with a holographic courtroom. This is an original creative direction, not a factual claim that no site has ever used these colors.

### Color tokens
| Token | Hex | Usage |
|---|---|---|
| Void Ink | `#07040E` | deep foundation |
| Nebula Plum | `#210B38` | structural surfaces |
| Ultraviolet Plasma | `#8B3DFF` | primary energy |
| Radioactive Chartreuse | `#D7FF3F` | active CTA / decisive signal |
| Ion Cyan | `#35F5FF` | evidence and data |
| Hot Coral | `#FF557F` | disputes and warnings |
| Liquid Tangerine | `#FF9A35` | pending and provisional |
| Opaline Lilac | `#E7D9FF` | elevated text |
| Ghost White | `#F7F5FF` | body on dark |
| Carbon Slate | `#171427` | panels |
| Electric Mint | `#50FFB1` | confirmed outcomes |
| Deep Magenta | `#D629FF` | spectral accent |

**Signature gradient:** `linear-gradient(112deg, #8B3DFF 0%, #D629FF 27%, #35F5FF 63%, #D7FF3F 100%)`.
**Spectral mesh:** subtle layered radial gradients behind content; never sacrifice readability.
**Material system:** matte near-black glass, crisp 1px spectral edge, inner glow on focus, irregular orbital lines, high-resolution SVG evidence graphs.
**Typography:** expressive variable display sans with safe local/system fallbacks; technical monospaced data labels. Do not distribute commercial font files.
**Composition:** asymmetrical editorial hero, oversized numbered metrics, dense but legible data tables, command-palette navigation, evidence constellation diagram, diagonal corner cuts, animated spectral borders. Avoid generic neon dashboard templates.
**Motion:** restrained 150–350ms transforms, purposeful pending-state sweeps, no continuous heavy blur. Respect `prefers-reduced-motion`.
**Accessibility:** WCAG 2.2 AA target, 4.5:1 normal text contrast, keyboard navigation, visible focus, color+text statuses, screen-reader descriptions, responsive 320px–wide desktop, touch targets ≥44px where practical.

### Component inventory
`AppShell`, `SpectralNav`, `NetworkPill`, `WalletConnect`, `AgreementEditor`, `RubricMatrix`, `PolicyDiff`, `ScenarioSimulator`, `AgentPassport`, `DelegationGraph`, `EvidenceUploader` (hash/link registration only), `EvidenceGraph`, `VerdictCard`, `CriterionFinding`, `ChallengeTimeline`, `RecoveryPanel`, `SettlementLedger`, `RiskMeter`, `ContractEventFeed`, `AdapterCatalog`, `TxProgress`, `EmptyState`, `ErrorBoundary`, `Toast`, `Skeleton`, `CopyHash`.

## 4. Universal protocol model

### 4.1 Core entities
- **PolicyTemplate:** template ID, owner, revision, canonical text hash, compatibility, allowed evidence, challenge policy.
- **EvaluationModule:** module ID, immutable version, criteria schema, supported evidence types, evaluator strategy, authority bounds, status.
- **Agreement:** ID, creator, counterparty, frozen policy/rubric hashes, monetary terms, deadlines, module/version, lifecycle state.
- **Milestone:** ordered ID, deliverables, budget allocation, dependencies, acceptance criteria, state.
- **AgentPassport:** wallet/agent identity reference, claimed capabilities, verified completion metrics, delegations, revocations.
- **Delegation:** parent, child, scope, authority, spend cap, expiration, acceptance.
- **EvidencePacket:** ID, submitter, hash, source URL/reference, timestamp, content type, claim mapping, source classification, visibility.
- **EvaluationAttempt:** agreement/milestone, evidence snapshot, evaluator version, requested time, transaction ID, result status.
- **Finding:** criterion ID, outcome, explanation, citations, uncertainty class, rule version, normalized rationale.
- **Verdict:** verdict ID, structured findings, decision enum, partial completion, eligible recovery, proposal/finality metadata.
- **Challenge:** challenger, standing, grounds, linked verdict, submitted evidence, deadline, state.
- **SettlementInstruction:** agreement, asset/amount, recipient, allowed action, unlock condition, execution/failure status.
- **ReputationEvent:** subject, finalized source verdict, context, score delta, anti-gaming metadata.
- **AuditReceipt:** canonical hashes, references, policy/module versions, verdict/finality references.

### 4.2 Agreement state machine
`DRAFT → PROPOSED → ACCEPTED → FUNDED/ACTIVE → EVIDENCE_OPEN → EVALUATING → PROVISIONAL → CHALLENGE_WINDOW → FINALIZED → SETTLED/CLOSED`.
Branches: `DECLINED`, `EXPIRED`, `CANCELLED_BY_RULE`, `EVALUATION_ERROR`, `CHALLENGED → REEVALUATING`, `REMEDIATION_REQUESTED → EVIDENCE_OPEN`, `PARTIAL`, `TERMINATED`, `SETTLEMENT_BLOCKED`.
No illegal backward transitions. Challenge windows must be derived from verifiable chain time/consensus semantics; never assume browser time enforces deadlines. A proposed consensus result is not protocol-final until network finality and application challenge requirements are both met.

### 4.3 Non-deterministic judgment and equivalence
For each evaluation module, document: evidence sources, retrieval timing, canonical input snapshot, schema, allowed decisions, score range, citation rules, unsupported cases, validator equivalence, retries, and rejection behavior.
- `strict_eq` ONLY for exactly reproducible normalized outputs.
- Semantic/web/LLM verdicts: verified custom leader/validator strategy; compare normalized decision, required criterion outcomes, evidence support, and permissible uncertainty tolerances—not free-form prose bytes.
- Do not equate model agreement with truth. Contradictions and missing evidence must produce `INSUFFICIENT_EVIDENCE` or escalation.
- Require bounded JSON schema; parse aliases defensively; cap input lengths and URL count; classify errors `EXPECTED`, `EXTERNAL`, `TRANSIENT`, `LLM_ERROR`.
- Reject evidence-injected instructions; evidence text is data, not authority.
- Separate deterministic constraints from subjective adjudication.

### 4.4 Canonical verdict envelope
```json
{
  "schema_version": "1",
  "agreement_id": "A-001",
  "module_id": "api-delivery",
  "module_version": "1.0.0",
  "decision": "PASS|PARTIAL|FAIL|INSUFFICIENT_EVIDENCE|ERROR",
  "criteria": [{"id":"auth","status":"PASS","reason":"...","evidence_ids":["E-01"]}],
  "uncertainty": "LOW|MEDIUM|HIGH|UNKNOWN",
  "limitations": [],
  "policy_hash": "0x...",
  "evidence_root": "0x...",
  "remedy": "NONE|RETRY|REWORK|PARTIAL_SETTLEMENT|ESCALATE"
}
```
Schema is conceptual; map fields to GenVM-safe bounded storage types and verified GenLayer ABI constraints.

## 5. First two complete evaluation modules

### A. API Delivery Verification
Rubric: endpoint coverage, status/schema behavior, authentication, error handling, documented functionality, version consistency, evidence freshness, test reproducibility, security constraints. Do not equate a self-reported test screenshot with independently verified passing tests. Use public test fixtures and deterministic checks where feasible; evaluate semantic gaps only with validators. Private APIs without accessible evidence return `INSUFFICIENT_EVIDENCE`.

### B. AI-Agent Task Verification
Rubric: task coverage, output relevance, correctness, constraint adherence, completeness, evidence reliability, timeliness, authorized delegation, attribution. Permit deliverables such as reports, source repositories, URLs, public artifacts, and structured execution traces. Never claim to inspect inaccessible files.

**Shared acceptance:** happy path, failed delivery, partial completion, missing evidence, malicious URL content, changing page, contradictory evidence, unreachable API, replayed packet, invalid rubric, conflicting policy, appealed decision, expired agreement, settlement double-spend prevention.

## 6. Complete standout feature register — all 40

Status legend: **P0** = initial implemented path, **P1** = substantial follow-on, **P2** = designed extensibility / future delivery. These are target priorities, not claims of completion.

| # | Feature | Priority | Acceptance intent |
|---|---|---|---|
| 1 | Counterfactual Verdict Simulator | P1 | advisory branches, labeled non-binding |
| 2 | Proof-of-Work Quality Engine | P0 | criterion-level proof-of-delivery receipt |
| 3 | Multi-Agent Causality Engine | P1 | dependency and responsibility findings with uncertainty |
| 4 | Constitutional Agreement Engine | P0 | immutable accepted policy/version |
| 5 | Autonomous Recovery Engine | P0 | permitted rework/partial/termination states |
| 6 | Evidence Authenticity Firewall | P0 | reject malformed/replayed/suspicious evidence, flag unverifiable |
| 7 | Source Reliability Graph | P1 | trace independent source provenance |
| 8 | Semantic Agreement Compiler | P1 | propose rubric, require explicit acceptance |
| 9 | Contradiction Detection Engine | P0 | conflicting evidence yields review/uncertainty |
| 10 | Adversarial Evidence Testing | P1 | challenge claims with alternative interpretations |
| 11 | Evaluation Consistency Monitor | P1 | identify diverging comparable verdicts |
| 12 | Precedent Intelligence Engine | P2 | contextual historical references, no binding override |
| 13 | Evidence Freshness Monitor | P0 | age and retrieval metadata in findings |
| 14 | Dynamic Risk Classification | P1 | transparent risk tiers and warnings |
| 15 | Verdict Explanation Graph | P0 | criterion → evidence → rule → outcome |
| 16 | Agent Identity and Capability Passport | P0 | wallet-linked verifiable history |
| 17 | Agent-to-Agent Negotiation Protocol | P1 | bounded offer/counteroffer/acceptance |
| 18 | Agent Delegation Accountability | P0 | scoped delegation, revocation, lineage |
| 19 | Agent Spending and Permission Firewall | P0 | deterministic caps, expirations and authorized actions |
| 20 | Agent Collusion Detection | P2 | anomaly flagging only, no automatic guilt |
| 21 | Agent Reliability Forecasting | P2 | explainable uncertainty-aware risk estimate |
| 22 | Universal Evaluation Adapter SDK | P1 | typed adapter manifest and compatibility tests |
| 23 | Evaluation-as-a-Service API | P2 | **no backend**: browser/SDK direct contract read/write interface, not hosted API |
| 24 | Policy Template Marketplace | P1 | on-chain registry of versioned templates |
| 25 | Modular Evidence Connectors | P1 | browser/public-source adapters; no credentialed server |
| 26 | Verifiable Verdict Receipts | P0 | exportable hash-linked final verdict |
| 27 | Cross-Application Reputation | P1 | portable on-chain references and anti-gaming controls |
| 28 | Batch Evaluation Engine | P2 | bounded independent batches, avoid gas/LLM exhaustion |
| 29 | Event-Driven Automation | P2 | contract events + user-run client watchers; no always-on backend |
| 30 | Versioned Evaluation Modules | P0 | immutable version binding per agreement |
| 31 | Developer Sandbox | P1 | browser-only simulation/testnet integration |
| 32 | Contract Observability Dashboard | P0 | actual on-chain transaction/contract state |
| 33 | Webhook and Event Subscription System | P2 | **no hosted webhook delivery**; client subscriptions only |
| 34 | Evaluation Cost Estimator | P1 | clearly labeled estimates, not guarantees |
| 35 | Anti-Prompt-Injection Evidence Gateway | P0 | untrusted-input separation, bounded outputs |
| 36 | Evidence Commitment and Reveal | P1 | hashes, reveal windows, mismatch rejection |
| 37 | Privacy-Preserving Evidence Registry | P1 | hashes and references only, explicit public-chain warning |
| 38 | Appeal and Reconsideration Engine | P0 | eligibility, deadlines, state, verdict revision |
| 39 | Settlement Safety Vault | P0 | verified support or safe disabled mode, no fake escrow |
| 40 | Sybil-Resistant Reputation | P1 | evidence-linked weighting, abuse limits, honest limitations |

### Additional foundational features (from original product scope)
Natural-language task agreements; milestone and retroactive settlement policy; multi-agent task dependencies; evidence provenance; standardized citations; explainable outcomes; structured uncertainty; deterministic authorization; identity/permissions; rubric versioning; portable reputation; recovery; settlement receipts; extension registry; human intervention; governance with bounded powers; auditable lifecycle; developer integration; responsive frontend.

## 7. Financial and safety invariants
1. Funds never move merely because a model says 'pay'; deterministic authorization, balances, recipient, amount and finality gates are mandatory.
2. If StudioNet/GenVM cannot natively custody or transfer the requested asset in verified APIs, implement **settlement authorization receipts only** and visibly disable actual escrow/payout controls.
3. No arbitrary agent may alter frozen policies, submit on another identity's behalf, or exceed delegation bounds.
4. Every appeal must be tied to a specific provisional/finalizable verdict and authorized grounds.
5. No reputation update from provisional verdicts.
6. Evidence hashes are integrity commitments, not authenticity proofs.
7. No private API tokens or personal data in on-chain arguments, URLs, logs, or browser bundles.
8. No automatic high-stakes penalties based only on inferred collusion or speculative causality.
9. Upgrade/module changes cannot silently affect existing accepted agreements.
10. All network failures must preserve honest transaction status and retry safety.

## 8. Contract decomposition (subject to verified GenVM support)
Prefer a **single auditable primary contract** for initial launch, separating pure evaluation helpers/modules within the repository. Split into multiple on-chain contracts only after verifying cross-contract calling semantics, storage/gas/size limits, and deployment implications.

Proposed public surface (conceptual names, NOT verified GenLayer SDK ABI):
- `create_agreement`, `propose_terms`, `accept_agreement`, `activate_agreement`
- `register_module`, `register_policy_template`, `register_agent`, `delegate_scope`
- `submit_evidence`, `request_evaluation`, `challenge_verdict`, `finalize_verdict`
- `request_rework`, `acknowledge_recovery`, `authorize_settlement`, `record_settlement`
- `get_agreement`, `get_verdict`, `get_evidence_metadata`, `get_agent_passport`, `get_protocol_stats`
Use schema inspection to determine actual method names and frontend bindings.

## 9. Frontend technical specification
React + TypeScript + Vite; CSS variables and authored design system; SVG/CSS effects; accessible semantic HTML. Use `genlayer-js@1.1.8`, official StudioNet chain configuration or verified custom chain declaration, wallet injection via verified SDK/provider path, and generated/inspected deployed schema. No API route, proxy, BFF, hosted queue, DB, or private server.

State layers:
- canonical: GenLayer reads/writes and transaction receipts;
- ephemeral: in-memory React state;
- browser-local: optional unsent drafts/preferences, explicitly non-authoritative.
Provide polling/refresh for pending transactions; avoid claiming background always-on monitoring. Display source and network timestamps.

## 10. Security and abuse cases
Threat-model prompt injection in URLs, malicious JSON, broken redirects, huge pages, SSRF-like targets where relevant to GenVM, stale data, source substitution, compromised agent wallet, forged delegation, replayed evidence, reentrancy/double settlement where applicable, privilege escalation, griefing through appeals, Sybil farms, data leaks, unavailable web sources, validator disagreement, chain reorg/finality ambiguity, and browser wallet spoofing. Write negative tests for each relevant contract boundary.

## 11. Metrics and evidence of readiness
- Real contract deployed on StudioNet and address committed with network ID, source hash and schema.
- Lint passes for every contract file.
- Direct tests cover each legal and illegal state transition.
- Integration tests verify consensus/equivalence and live network behavior where accessible.
- Frontend typecheck, build, tests and browser wallet flows pass.
- Real API-delivery and agent-task examples produce inspectable transaction receipts.
- Finality and appeals accurately reflected in UI.
- Settlement controls truthfully gated to verified chain support.
- Security review records open risks; no invented audit claim.
- Performance targets measured and reported, never assumed.

## 12. Release phases
**Stage 0:** official documentation audit, capability matrix, architecture decisions, threat model.
**Stage 1:** contract states, policies, identity, delegations, storage and permissions.
**Stage 2:** evidence provenance, API delivery and agent task evaluation, equivalence.
**Stage 3:** challenges, recovery, reputation, settlement authorization.
**Stage 4:** spectacular frontend, wallet, real transactions, explanation graph.
**Stage 5:** simulations, templates, SDK, source graph, negotiation, monitoring.
**Stage 6:** integration testing, deployment, verified receipts, security hardening.
**Future:** full P2 features only where backend-free constraints permit; otherwise document deliberate exclusions.

## 13. Definition of done
A reviewer can connect a compatible wallet, create and accept an agreement, submit verifiable public evidence, request a real GenLayer intelligent evaluation, inspect a structured provisional verdict, challenge where allowed, finalize after the relevant windows, see a truthful settlement authorization and verifiable reputation history, and repeat both flagship module scenarios. Every user-facing feature indicates its real support status. All 40 standout features are explicitly accounted for in code, specs, tests, or a transparent deferred register.
