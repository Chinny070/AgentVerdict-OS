# Feature Implementation Ledger (initial — Stage 0)

This is the Stage 0 initial version, written before contract implementation, recording the **plan** for all 40 features against the P0/P1/P2 split in brief section 8. It will be superseded by a final truthful pass in `FINAL_HANDOFF.md` after implementation, which records what was actually built, tested, and verified versus deferred. Do not treat this file alone as proof of completion — `FINAL_HANDOFF.md` is authoritative once it exists.

## P0 — initial real path (brief section 8)

| # | Feature | Planned contract surface | Planned test |
|---|---|---|---|
| 2 | Proof-of-Work Quality Engine | `Verdict.findings_json` carries per-criterion evidence-id citations; `get_verdict` exposes them | `test_api_delivery.py` |
| 4 | Constitutional Agreement Engine | `propose_agreement` freezes `policy_hash`/`policy_revision`/`module_version` | `test_state_machine.py` |
| 5 | Autonomous Recovery Engine | `request_rework`, `acknowledge_recovery`, `terminate_agreement` | `test_disputes.py` |
| 6 | Evidence Authenticity Firewall | `submit_evidence` URL-scheme/length/dedup/SSRF checks | `test_evidence.py` |
| 9 | Contradiction Detection Engine | deterministic downgrade to `INSUFFICIENT_EVIDENCE` on unresolved evidence | `test_api_delivery.py` |
| 13 | Evidence Freshness Monitor | `EvidencePacket.submitted_at` + fetch status surfaced in verdict findings | `test_evidence.py` |
| 15 | Verdict Explanation Graph | `Finding` structure: criterion → evidence_ids → rule(module_version) → outcome | `test_api_delivery.py` |
| 16 | Agent Identity/Capability Passport | `register_agent`, `AgentPassport` | `test_access_control.py` |
| 18 | Delegation Accountability | `delegate_scope`, `accept_delegation`, `revoke_delegation` | `test_access_control.py` |
| 19 | Spending/Permission Firewall | `Delegation.spend_cap_atto`/`spent_atto`/`expires_at` enforced in `submit_evidence` | `test_access_control.py` |
| 26 | Verifiable Verdict Receipts | `get_audit_receipt` synthesizes hash-linked receipt from stored fields | `test_disputes.py` |
| 30 | Versioned Evaluation Modules | `modules` keyed `module_id@version`, immutable once registered | `test_access_control.py` |
| 32 | Contract Observability Dashboard | `get_protocol_stats` view method | `test_disputes.py` |
| 35 | Anti-Prompt-Injection Evidence Gateway | evidence text wrapped as DATA in every LLM prompt | `test_evidence.py` |
| 38 | Appeals/Reconsideration | `challenge_verdict`, `resolve_challenge` | `test_disputes.py` |
| 39 | Settlement Safety Vault | `settlement_native_transfer_enabled` defaults `False`; authorize/record split | `test_settlement.py` |

## P1 — build after proven P0

Planned: 1, 3, 7, 8, 10, 11, 14, 17, 22, 24, 25, 27, 31, 34, 36, 37, 40. **Not started this session** beyond what P0 incidentally covers (e.g. feature 3's conservative multi-agent handling is partially covered by the agent-task module's delegation-aware prompt, see `EQUIVALENCE_MATRIX.md` section 3, but the dedicated Causality Engine UI/data structure is not built).

## P2 — carefully bounded future

Planned: 12, 20, 21, 23 (client-SDK-only — no hosted API, consistent with architecture boundary), 28, 29 (client-driven only), 33 (client subscriptions only). **Not started this session.**

## Additional foundational features (spec section 6 addendum)

Natural-language task agreements (rubric stored as `rubric_json`, authored off-chain, frozen on-chain), milestone/retroactive settlement (simplified — see `PROTOCOL_ARCHITECTURE.md` section 3), multi-agent dependencies (partially — delegation lineage only), evidence provenance (`EvidencePacket` fields), standardized citations (`Finding.evidence_ids`), explainable outcomes (`Finding.reason` + `Verdict.limitations_json`), structured uncertainty (`Verdict.uncertainty`), deterministic authorization (state-machine guards), identity/permissions (`AgentPassport`/`Delegation`), rubric versioning (`PolicyTemplate.revision`), portable reputation (not yet — P1), recovery (`request_rework`), settlement receipts (`SettlementInstruction`), extension registry (`modules`), human intervention (admin `resolve_challenge` — centralized, see security doc), governance with bounded powers (admin-only surface is intentionally small), auditable lifecycle (full state history via per-attempt verdict keys), developer integration (deferred to Stage 5 SDK work), responsive frontend (deferred to Stage 4).
