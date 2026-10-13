/**
 * Typed read/write bindings for the deployed AgentVerdictOS contract.
 *
 * Return shapes below are transcribed field-for-field from each
 * `@gl.public.view` method's `return {...}` statement in
 * contracts/agentverdict.py (read in full) — not invented, and not copied
 * from the design spec's "conceptual" canonical verdict envelope in
 * section 4.4 of the spec, which differs slightly (e.g. the contract has
 * no top-level `schema_version` field; `criteria`/`limitations` arrive as
 * JSON-encoded strings that must be parsed with `JSON.parse`).
 */
import type { Address } from "viem";
import { getReadClient } from "./client";
import { type EthereumProviderLike, type WalletConnection } from "./client";
import { runWrite, type TxUpdate } from "./transactions";

export class ContractNotConfiguredError extends Error {
  constructor() {
    super("No contract address is configured. Set one on the Settings screen first.");
    this.name = "ContractNotConfiguredError";
  }
}

export interface AgreementView {
  agreement_id: string;
  creator: string;
  counterparty: string;
  policy_id: string;
  policy_revision: number;
  policy_hash: string;
  module_id: string;
  module_version: string;
  amount_atto: number;
  deadline: string;
  rubric_json: string;
  state: string;
  created_at: string;
  attempt_no: number;
  last_decision: string;
  last_remedy: string;
}

export interface CriterionFindingView {
  id: string;
  status: "PASS" | "FAIL" | "INSUFFICIENT_EVIDENCE";
  reason: string;
  evidence_ids: string[];
}

export interface VerdictView {
  verdict_id: string;
  agreement_id: string;
  module_id: string;
  module_version: string;
  decision: "PASS" | "PARTIAL" | "FAIL" | "INSUFFICIENT_EVIDENCE" | "ERROR";
  criteria: CriterionFindingView[];
  uncertainty: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  limitations: string[];
  policy_hash: string;
  evidence_root: string;
  remedy: "NONE" | "RETRY" | "REWORK" | "PARTIAL_SETTLEMENT" | "ESCALATE";
  state: "PROVISIONAL" | "FINAL";
  created_at: string;
  challenge_deadline: string;
  attempt_no: number;
}

export interface EvidenceRow {
  evidence_id: string;
  submitter: string;
  url: string;
  content_hash: string;
  mime_type: string;
  criterion_id: string;
  submitted_at: string;
  visibility: string;
}

export interface EvidenceMetadataView {
  agreement_id: string;
  evidence: EvidenceRow[];
}

export interface AgentPassportView {
  owner: string;
  capabilities_json: string;
  completed_count: number;
  disputed_count: number;
  reputation_score: number;
  registered_at: string;
  revoked: boolean;
}

export interface DelegationView {
  delegation_id: string;
  parent: string;
  child: string;
  scope_json: string;
  spend_cap_atto: number;
  spent_atto: number;
  expires_at: string;
  accepted: boolean;
  revoked: boolean;
  created_at: string;
}

export interface ChallengeView {
  challenge_id: string;
  agreement_id: string;
  verdict_attempt_no: number;
  challenger: string;
  grounds: string;
  submitted_at: string;
  deadline: string;
  // TIMEOUT_REJECTED (Stage 6): resolve_challenge_by_timeout fired because
  // the admin never called resolve_challenge before resolution_deadline.
  // Same effect as REJECTED (original verdict upheld), tagged distinctly
  // for an unambiguous audit trail. NOT available on the deployed
  // StudioNet instance -- see docs/STAGE_6_MIGRATION_NOTE.md.
  state: "OPEN" | "UPHELD" | "REJECTED" | "TIMEOUT_REJECTED";
  resolution: string;
  /** Stage 6: admin-response SLA, set when the challenge was filed.
   * After this passes with the challenge still OPEN, anyone may call
   * resolve_challenge_by_timeout. Absent (empty string) when read from
   * the currently-deployed StudioNet instance, which predates Stage 6. */
  resolution_deadline: string;
}

export interface SettlementView {
  settlement_id: string;
  agreement_id: string;
  recipient: string;
  amount_atto: number;
  status: "AUTHORIZED" | "EXECUTED";
  created_at: string;
  executed_at: string;
  reason: string;
}

export interface AuditReceiptView {
  agreement_id: string;
  policy_hash: string;
  module_id: string;
  module_version: string;
  state: string;
  verdict_id?: string;
  decision?: string;
  evidence_root?: string;
  verdict_state?: string;
  settlement_status?: string;
  settlement_amount_atto?: number;
}

export interface ProtocolStatsView {
  agreement_count: number;
  evidence_count: number;
  delegation_count: number;
  challenge_count: number;
  settlement_count: number;
  reputation_event_count: number;
  settlement_native_transfer_enabled: boolean;
  admin: string;
}

export interface PolicyTemplateView {
  policy_id: string;
  owner: string;
  revision: number;
  text_hash: string;
  challenge_window_seconds: number;
  allowed_evidence_csv: string;
  active: boolean;
  created_at: string;
}

export interface ModuleView {
  module_id: string;
  version: string;
  criteria_schema_json: string;
  evidence_types_csv: string;
  status: string;
  registered_at: string;
}

async function read<T>(address: Address, functionName: string, args: unknown[] = []): Promise<T> {
  const client = getReadClient();
  const result = await client.readContract({
    address,
    functionName,
    args: args as never,
  });
  return result as T;
}

export function requireAddress(address: string | null): Address {
  if (!address) throw new ContractNotConfiguredError();
  return address as Address;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const reads = {
  getAgreement: (address: Address, agreementId: string) => read<AgreementView>(address, "get_agreement", [agreementId]),
  getVerdict: (address: Address, agreementId: string) => read<VerdictView>(address, "get_verdict", [agreementId]),
  getEvidenceMetadata: (address: Address, agreementId: string) =>
    read<EvidenceMetadataView>(address, "get_evidence_metadata", [agreementId]),
  getAgentPassport: (address: Address, agent: string) => read<AgentPassportView>(address, "get_agent_passport", [agent]),
  getDelegation: (address: Address, delegationId: string) => read<DelegationView>(address, "get_delegation", [delegationId]),
  getChallenge: (address: Address, challengeId: string) => read<ChallengeView>(address, "get_challenge", [challengeId]),
  getSettlement: (address: Address, agreementId: string) => read<SettlementView>(address, "get_settlement", [agreementId]),
  getAuditReceipt: (address: Address, agreementId: string) => read<AuditReceiptView>(address, "get_audit_receipt", [agreementId]),
  getProtocolStats: (address: Address) => read<ProtocolStatsView>(address, "get_protocol_stats", []),
  getPolicyTemplate: (address: Address, policyId: string) => read<PolicyTemplateView>(address, "get_policy_template", [policyId]),
  getModule: (address: Address, moduleId: string, version: string) =>
    read<ModuleView>(address, "get_module", [moduleId, version]),
  getLatestModuleVersion: (address: Address, moduleId: string) =>
    read<string>(address, "get_latest_module_version", [moduleId]),
};

// ---------------------------------------------------------------------------
// Writes — every write goes through runWrite() so the UI only ever reports
// success after a real receipt confirms it (see chain/transactions.ts).
// ---------------------------------------------------------------------------

export interface WriteOptions {
  wallet: WalletConnection;
  address: Address;
  onUpdate?: (update: TxUpdate) => void;
}

function write(functionName: string, args: unknown[], opts: WriteOptions): Promise<TxUpdate> {
  return runWrite({
    account: opts.wallet.address,
    provider: opts.wallet.provider as EthereumProviderLike,
    address: opts.address,
    functionName,
    args,
    onUpdate: opts.onUpdate,
  });
}

export const writes = {
  registerModule: (opts: WriteOptions, moduleId: string, version: string, criteriaSchemaJson: string, evidenceTypesCsv: string) =>
    write("register_module", [moduleId, version, criteriaSchemaJson, evidenceTypesCsv], opts),
  registerPolicyTemplate: (opts: WriteOptions, policyId: string, textHash: string, challengeWindowSeconds: bigint, allowedEvidenceCsv: string) =>
    write("register_policy_template", [policyId, textHash, challengeWindowSeconds, allowedEvidenceCsv], opts),
  updatePolicyTemplate: (
    opts: WriteOptions,
    policyId: string,
    textHash: string,
    challengeWindowSeconds: bigint,
    allowedEvidenceCsv: string,
    active: boolean
  ) => write("update_policy_template", [policyId, textHash, challengeWindowSeconds, allowedEvidenceCsv, active], opts),

  registerAgent: (opts: WriteOptions, capabilitiesJson: string) => write("register_agent", [capabilitiesJson], opts),
  revokeAgent: (opts: WriteOptions, agent: string) => write("revoke_agent", [agent], opts),
  delegateScope: (opts: WriteOptions, child: string, scopeJson: string, spendCapAtto: bigint, expiresAt: string) =>
    write("delegate_scope", [child, scopeJson, spendCapAtto, expiresAt], opts),
  acceptDelegation: (opts: WriteOptions, delegationId: string) => write("accept_delegation", [delegationId], opts),
  revokeDelegation: (opts: WriteOptions, delegationId: string) => write("revoke_delegation", [delegationId], opts),

  createAgreement: (
    opts: WriteOptions,
    counterparty: string,
    policyId: string,
    moduleId: string,
    amountAtto: bigint,
    deadline: string,
    rubricJson: string
  ) => write("create_agreement", [counterparty, policyId, moduleId, amountAtto, deadline, rubricJson], opts),
  proposeAgreement: (opts: WriteOptions, agreementId: string) => write("propose_agreement", [agreementId], opts),
  acceptAgreement: (opts: WriteOptions, agreementId: string) => write("accept_agreement", [agreementId], opts),
  declineAgreement: (opts: WriteOptions, agreementId: string) => write("decline_agreement", [agreementId], opts),
  expireAgreement: (opts: WriteOptions, agreementId: string) => write("expire_agreement", [agreementId], opts),
  activateAgreement: (opts: WriteOptions, agreementId: string) => write("activate_agreement", [agreementId], opts),
  openEvidence: (opts: WriteOptions, agreementId: string) => write("open_evidence", [agreementId], opts),
  submitEvidence: (opts: WriteOptions, agreementId: string, url: string, contentHash: string, mimeType: string, criterionId: string) =>
    write("submit_evidence", [agreementId, url, contentHash, mimeType, criterionId], opts),

  requestEvaluation: (opts: WriteOptions, agreementId: string) => write("request_evaluation", [agreementId], opts),

  challengeVerdict: (opts: WriteOptions, agreementId: string, grounds: string) =>
    write("challenge_verdict", [agreementId, grounds], opts),
  resolveChallenge: (opts: WriteOptions, challengeId: string, upheld: boolean, resolution: string) =>
    write("resolve_challenge", [challengeId, upheld, resolution], opts),
  /** Stage 6. Permissionless -- any connected wallet may call this once
   * resolution_deadline has passed with the challenge still OPEN. Not
   * present on the deployed StudioNet instance; see
   * docs/STAGE_6_MIGRATION_NOTE.md. */
  resolveChallengeByTimeout: (opts: WriteOptions, challengeId: string) =>
    write("resolve_challenge_by_timeout", [challengeId], opts),

  finalizeVerdict: (opts: WriteOptions, agreementId: string) => write("finalize_verdict", [agreementId], opts),
  requestRework: (opts: WriteOptions, agreementId: string, reason: string) => write("request_rework", [agreementId, reason], opts),
  acknowledgeRecovery: (opts: WriteOptions, agreementId: string) => write("acknowledge_recovery", [agreementId], opts),
  terminateAgreement: (opts: WriteOptions, agreementId: string, reason: string) =>
    write("terminate_agreement", [agreementId, reason], opts),
  cancelByRule: (opts: WriteOptions, agreementId: string) => write("cancel_by_rule", [agreementId], opts),

  authorizeSettlement: (opts: WriteOptions, agreementId: string) => write("authorize_settlement", [agreementId], opts),
  recordSettlement: (opts: WriteOptions, agreementId: string) => write("record_settlement", [agreementId], opts),
  setSettlementNativeTransferEnabled: (opts: WriteOptions, enabled: boolean) =>
    write("set_settlement_native_transfer_enabled", [enabled], opts),
};

export function parseCriteria(findingsJson: string): CriterionFindingView[] {
  try {
    const parsed = JSON.parse(findingsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
