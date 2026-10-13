# Protocol Architecture

## 1. Architectural boundary

Per the design spec and build brief: **one on-chain Intelligent Contract + a static frontend**. No backend server, no hosted database, no relayer. This document records the decisions made to fit the full 40-feature ledger into that boundary honestly, including what was simplified and why.

## 2. Single auditable contract decision

Spec section 8 prefers "a single auditable primary contract for initial launch" and warns against forcing a conventional Python package structure onto GenVM. This project follows that: `contracts/agentverdict.py` is the **only** on-chain contract. The two flagship evaluation modules (API Delivery Verification, AI-Agent Task Verification) are implemented as internal methods/functions inside that same file, not as separate importable Python modules, because GenVM's multi-file support (`py-genlayer-multi`) was not verified in this session and the brief explicitly says to consolidate rather than guess at unverified import semantics. `contracts/modules/` therefore holds **documentation-only** module specification files (`api_delivery.md`, `agent_task.md`) describing the rubric/schema contract, not executable Python — this is called out so it is never mistaken for dead/unused code.

## 3. Entity model (spec section 4.1) → storage mapping

All entities are flat `@allow_storage` dataclasses (scalar fields only: `str`, `u256`, `i256`, `bool`, `Address`) held in `TreeMap[str, X]` keyed by a string id, following the "no persisted dict/list, no float for money" storage rule. Lists-of-children are represented as comma-separated id strings in a companion `TreeMap[str, str]` index (e.g. `evidence_by_agreement["A-1"] == "E-1,E-2"`) rather than nested `DynArray` inside a dataclass, to minimize storage-layout risk given the unverified multi-file/complex-nesting behavior of the pinned runner; this is a deliberate conservative choice, not an oversight.

| Spec entity | Contract storage | Notes |
|---|---|---|
| PolicyTemplate | `policy_templates: TreeMap[str, PolicyTemplate]` | keyed by `policy_id`; revisions increment in place, frozen hash copied into the agreement at proposal time |
| EvaluationModule | `modules: TreeMap[str, EvalModule]`, key `f"{module_id}@{version}"`; `modules_latest: TreeMap[str,str]` | immutable per version; `register_module` cannot overwrite an existing version |
| Agreement | `agreements: TreeMap[str, Agreement]`, `agreement_ids: DynArray[str]` | see `STATE_MACHINE.md` |
| Milestone | **not implemented as a separate entity in Stage 1-3.** | Documented simplification: the spec's milestone/retroactive-settlement granularity is collapsed into the single-agreement lifecycle for the first real path (one evaluation cycle per agreement, with rework/partial/reevaluation loops). Multi-milestone decomposition is listed as a P1 gap in `FEATURE_IMPLEMENTATION_LEDGER.md`, not silently dropped. |
| AgentPassport | `passports: TreeMap[str, AgentPassport]`, key = lowercase hex address | self-registered; `reputation_score` only updates from `_apply_reputation_event`, which is only reachable from `finalize_verdict` |
| Delegation | `delegations: TreeMap[str, Delegation]`, `delegation_ids: DynArray[str]` | parent-created, child-accepted, spend cap enforced in `submit_evidence`/future spend paths |
| EvidencePacket | `evidence: TreeMap[str, EvidencePacket]`, `evidence_by_agreement: TreeMap[str,str]` | bounded URL/hash length, scheme allow-list, de-duplicated by content hash per agreement |
| EvaluationAttempt | folded into `Verdict.attempt_no` + the historical key `f"{agreement_id}#{attempt_no}"` | kept the entity count down; the attempt metadata (module version, evidence snapshot ids) lives on the `Verdict` row itself |
| Finding | JSON array inside `Verdict.findings_json` | per-criterion structured findings; never free text matched for consensus — see `EQUIVALENCE_MATRIX.md` |
| Verdict | `verdicts: TreeMap[str, Verdict]` keyed by `agreement_id` (current) and by `f"{agreement_id}#{attempt_no}"` (history) | |
| Challenge | `challenges: TreeMap[str, Challenge]`, `challenges_by_agreement: TreeMap[str,str]` | |
| SettlementInstruction | `settlements: TreeMap[str, SettlementInstruction]` keyed by `agreement_id` | authorization-receipt model; see section 5 |
| ReputationEvent | `reputation_events: TreeMap[str, ReputationEvent]`, `reputation_by_subject: TreeMap[str,str]` | only ever written from a `FINALIZED` verdict |
| AuditReceipt | synthesized on read by `get_audit_receipt(agreement_id)`, not stored separately | avoids a redundant duplicate of data already in `Agreement`/`Verdict` |

## 4. Address coercion (live-bug prevention, not speculative hardening)

A shared `_coerce_address(value)` helper is applied to **every** `Address`-typed constructor and method parameter. It accepts: an `Address` (passthrough), `bytes` (passthrough to `Address(...)`), a hex `str` (`0x...` or bare hex), and a plain Python `int` — handled via `int.to_bytes(20, "big")`, never via `Address(some_int)`, because `Address(int)` goes through `bytes(int)` constructor semantics (a zero-filled buffer of that many bytes, not an encoding of the int) and silently corrupts or crashes. This is a previously-confirmed live GenVM bug (an `int`-shaped address argument on real StudioNet, not reproducible in direct-mode testing), applied proactively here rather than rediscovered.

## 5. Settlement / asset-custody decision

No method in this contract is `@gl.public.write.payable`. `activate_agreement` does not accept GEN value. This is a deliberate, conservative reading of spec invariant #2 ("if StudioNet/GenVM cannot natively custody or transfer the requested asset in verified APIs, implement settlement authorization receipts only and visibly disable actual escrow/payout controls") combined with the previously-confirmed live finding that a reverted payable call on StudioNet does not roll back attached value. Rather than carefully sequencing every payable method to validate before touching value (the brief's option (a)), this build sidesteps the footgun entirely for the first real path: `amount_atto` on an `Agreement` is a recorded **authorized** number, and `SettlementInstruction` tracks `AUTHORIZED` vs `EXECUTED` vs `BLOCKED` status without ever moving funds, unless the admin explicitly flips `settlement_native_transfer_enabled` to `True` — which gates an **outbound** `gl.chain.Account(recipient).emit_transfer(...)` call from `record_settlement` (outbound transfers were not implicated in the non-rollback bug; only inbound payable value was). Default is `False`. This is the "Settlement Safety Vault" feature (39) implemented as "safe disabled mode", exactly as the ledger requires, not a fake escrow.

## 6. Governance centralization (honest limitation)

`register_module`, `resolve_challenge`, and `settlement_native_transfer_enabled` toggling are **admin-gated** (`admin` = the address that deployed the contract) in this first real path. The spec's longer-term vision (feature 20 Collusion Detection, feature 17 Negotiation, decentralized jurors for challenges) is P1/P2 and explicitly deferred — see `FEATURE_IMPLEMENTATION_LEDGER.md`. This centralization is a real limitation, stated plainly here and in `SECURITY_THREAT_MODEL.md`, not hidden behind a "governance" label that implies decentralization that does not exist yet.

## 7. Time source

Every deadline/window computation uses `gl.message.datetime` (an ISO-8601 UTC string, part of the deterministic transaction context the SDK reference documents as "Transaction datetime") — never Python wall-clock, never browser/client time. ISO-8601 UTC strings with a trailing `Z`/`+00:00` sort correctly under plain string comparison for the "has the deadline passed" checks used throughout, but this contract parses them with `datetime.fromisoformat` and compares as `datetime` objects to avoid relying on that coincidence when formats vary slightly (e.g. missing timezone suffix).

## 8. What is explicitly NOT implemented in this build (see FINAL_HANDOFF.md for the authoritative blocker list)

- Frontend (Stage 4) — not started this session.
- StudioNet deployment — not performed; this agent has no signing key access as a hard operating boundary, independent of any apparent authorization in the brief's text.
- Live integration tests against real consensus/LLM/web — blocked, no running GenVM node or LLM provider in this environment.
- Multi-milestone agreements, decentralized challenge jurors, cross-application reputation portability, negotiation protocol, precedent engine, collusion detection — P1/P2, deferred per the ledger.
