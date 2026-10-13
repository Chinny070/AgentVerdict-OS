/**
 * Contract schema — static manifest + live schema verification.
 *
 * The static manifest below is transcribed directly from
 * contracts/agentverdict.py (read in full before writing this file), not
 * from the design spec's "conceptual names" list in section 8 of the build
 * brief, which explicitly warns those names are NOT verified SDK ABI.
 * Every method name, parameter name, and parameter order here matches a
 * `@gl.public.write` / `@gl.public.view` method signature in that file.
 *
 * Once a real contract address is configured, `verifyLiveSchema()` fetches
 * the actual on-chain schema via genlayer-js's `getContractSchema` (the
 * real GenVM-introspected ABI) and diffs it against this manifest, so a
 * stale manifest is caught rather than silently trusted. This is the
 * "whichever is more reliable" cross-check the task asked for.
 */
import type { ContractSchema } from "genlayer-js/types";
import type { Address } from "viem";
import { getReadClient } from "./client";

export type ParamKind = "str" | "address" | "u256" | "bool" | "json-str";

export interface ParamSpec {
  name: string;
  kind: ParamKind;
  help?: string;
}

export interface MethodSpec {
  name: string;
  mutability: "view" | "write";
  params: ParamSpec[];
  returns: string;
  summary: string;
}

const addr = (name: string, help?: string): ParamSpec => ({ name, kind: "address", help });
const str = (name: string, help?: string): ParamSpec => ({ name, kind: "str", help });
const u256 = (name: string, help?: string): ParamSpec => ({ name, kind: "u256", help });
const bool = (name: string, help?: string): ParamSpec => ({ name, kind: "bool", help });
const json = (name: string, help?: string): ParamSpec => ({ name, kind: "json-str", help });

/** Transcribed 1:1 from contracts/agentverdict.py public methods. */
export const CONTRACT_METHODS: MethodSpec[] = [
  // module registry
  {
    name: "register_module",
    mutability: "write",
    params: [str("module_id"), str("version"), json("criteria_schema_json"), str("evidence_types_csv")],
    returns: "None",
    summary: "Admin-only. Registers an immutable evaluation module version.",
  },
  { name: "get_module", mutability: "view", params: [str("module_id"), str("version")], returns: "dict", summary: "Read one module version." },
  { name: "get_latest_module_version", mutability: "view", params: [str("module_id")], returns: "str", summary: "Latest registered version string for a module_id." },

  // policy templates
  {
    name: "register_policy_template",
    mutability: "write",
    params: [str("policy_id"), str("text_hash"), u256("challenge_window_seconds"), str("allowed_evidence_csv")],
    returns: "None",
    summary: "Registers a new versioned policy/rubric template.",
  },
  {
    name: "update_policy_template",
    mutability: "write",
    params: [str("policy_id"), str("text_hash"), u256("challenge_window_seconds"), str("allowed_evidence_csv"), bool("active")],
    returns: "None",
    summary: "Owner-only. Bumps a policy template's revision.",
  },
  { name: "get_policy_template", mutability: "view", params: [str("policy_id")], returns: "dict", summary: "Read a policy template." },

  // agent identity / delegation
  { name: "register_agent", mutability: "write", params: [json("capabilities_json")], returns: "None", summary: "Registers or updates the caller's AgentPassport." },
  { name: "revoke_agent", mutability: "write", params: [addr("agent")], returns: "None", summary: "Admin-only. Revokes an agent's passport." },
  { name: "get_agent_passport", mutability: "view", params: [addr("agent")], returns: "dict", summary: "Read an agent's passport." },
  {
    name: "delegate_scope",
    mutability: "write",
    params: [addr("child"), json("scope_json"), u256("spend_cap_atto"), str("expires_at")],
    returns: "str (delegation_id)",
    summary: "Creates a scoped delegation from the caller to a child agent.",
  },
  { name: "accept_delegation", mutability: "write", params: [str("delegation_id")], returns: "None", summary: "Child-only. Accepts a pending delegation." },
  { name: "revoke_delegation", mutability: "write", params: [str("delegation_id")], returns: "None", summary: "Parent or admin-only. Revokes a delegation." },
  { name: "get_delegation", mutability: "view", params: [str("delegation_id")], returns: "dict", summary: "Read a delegation." },

  // agreement lifecycle
  {
    name: "create_agreement",
    mutability: "write",
    params: [
      addr("counterparty"),
      str("policy_id"),
      str("module_id"),
      u256("amount_atto"),
      str("deadline"),
      json("rubric_json"),
    ],
    returns: "str (agreement_id)",
    summary: "Creates a DRAFT agreement bound to a frozen policy + module version.",
  },
  { name: "propose_agreement", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Creator-only. DRAFT -> PROPOSED." },
  { name: "accept_agreement", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Counterparty-only. PROPOSED -> ACCEPTED." },
  { name: "decline_agreement", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Counterparty-only. PROPOSED -> DECLINED." },
  { name: "expire_agreement", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Anyone, after deadline. PROPOSED -> EXPIRED." },
  { name: "activate_agreement", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Either party. ACCEPTED -> ACTIVE." },
  { name: "open_evidence", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Either party. ACTIVE -> EVIDENCE_OPEN." },
  {
    name: "submit_evidence",
    mutability: "write",
    params: [str("agreement_id"), str("url"), str("content_hash"), str("mime_type"), str("criterion_id")],
    returns: "str (evidence_id)",
    summary: "Party or accepted delegate. Registers one evidence packet.",
  },
  { name: "get_evidence_metadata", mutability: "view", params: [str("agreement_id")], returns: "dict", summary: "Read all evidence for an agreement." },

  // evaluation
  { name: "request_evaluation", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Either party. Runs the bound evaluation module (real GenVM LLM adjudication)." },
  { name: "get_verdict", mutability: "view", params: [str("agreement_id")], returns: "dict", summary: "Read the latest verdict for an agreement." },

  // challenges
  { name: "challenge_verdict", mutability: "write", params: [str("agreement_id"), str("grounds")], returns: "str (challenge_id)", summary: "Either party, within the challenge window. Sets a resolution_deadline for admin response (Stage 6)." },
  {
    name: "resolve_challenge",
    mutability: "write",
    params: [str("challenge_id"), bool("upheld"), str("resolution")],
    returns: "None",
    summary: "Admin-only. Resolves an open challenge before its resolution_deadline.",
  },
  {
    name: "resolve_challenge_by_timeout",
    mutability: "write",
    params: [str("challenge_id")],
    returns: "None",
    summary: "Stage 6. Anyone, only after resolution_deadline has passed with no admin action. Deterministically upholds the original verdict (never the challenge) and reopens the challenge window — the same effect as resolve_challenge(upheld=false), tagged TIMEOUT_REJECTED for an unambiguous audit trail. NOT available on the deployed StudioNet instance (0xb222305575ee8af1255d8aCd196280b405B54Baf) — see docs/STAGE_6_MIGRATION_NOTE.md.",
  },
  { name: "get_challenge", mutability: "view", params: [str("challenge_id")], returns: "dict", summary: "Read a challenge, including resolution_deadline and state (OPEN/UPHELD/REJECTED/TIMEOUT_REJECTED)." },

  // finalization / recovery / settlement
  { name: "finalize_verdict", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Anyone, after the challenge window closes with no open challenge." },
  { name: "request_rework", mutability: "write", params: [str("agreement_id"), str("reason")], returns: "None", summary: "Either party, when the latest verdict's remedy is REWORK." },
  { name: "acknowledge_recovery", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Either party. REMEDIATION_REQUESTED -> EVIDENCE_OPEN." },
  { name: "terminate_agreement", mutability: "write", params: [str("agreement_id"), str("reason")], returns: "None", summary: "Admin-only. Terminates an agreement that meets termination criteria." },
  { name: "cancel_by_rule", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Either party, after deadline passes with no other terminal state." },
  { name: "authorize_settlement", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Either party, after FINALIZED with a PASS/PARTIAL decision. Creates an authorization receipt only — no fund movement." },
  { name: "record_settlement", mutability: "write", params: [str("agreement_id")], returns: "None", summary: "Marks an authorized settlement EXECUTED. Native transfer is disabled by default (settlement_native_transfer_enabled=False)." },
  { name: "set_settlement_native_transfer_enabled", mutability: "write", params: [bool("enabled")], returns: "None", summary: "Admin-only. Toggles the (unverified-stub) native transfer path." },
  { name: "get_settlement", mutability: "view", params: [str("agreement_id")], returns: "dict", summary: "Read a settlement instruction." },

  // observability
  { name: "get_agreement", mutability: "view", params: [str("agreement_id")], returns: "dict", summary: "Read full agreement state." },
  { name: "get_audit_receipt", mutability: "view", params: [str("agreement_id")], returns: "dict", summary: "Combined policy/module/verdict/settlement receipt." },
  { name: "get_protocol_stats", mutability: "view", params: [], returns: "dict", summary: "Protocol-wide counters. Backs Protocol Telemetry." },
];

export interface SchemaVerificationResult {
  checkedAt: string;
  address: Address;
  ok: boolean;
  liveMethodCount: number;
  manifestMethodCount: number;
  missingFromLive: string[];
  extraOnLive: string[];
  error?: string;
}

/**
 * Fetches the REAL on-chain schema for a deployed address using
 * genlayer-js's `getContractSchema` (confirmed signature:
 * `(address: Address) => Promise<ContractSchema>` in
 * node_modules/genlayer-js/dist/index-C3Ul1Rte.d.ts) and diffs method names
 * against the static manifest above. Never fabricates a result: any RPC
 * failure is surfaced as `ok: false` with the real error message.
 */
export async function verifyLiveSchema(address: Address): Promise<SchemaVerificationResult> {
  const manifestNames = new Set(CONTRACT_METHODS.map((m) => m.name));
  try {
    const client = getReadClient();
    const schema: ContractSchema = await client.getContractSchema(address);
    const liveNames = new Set(Object.keys(schema.methods));
    const missingFromLive = [...manifestNames].filter((n) => !liveNames.has(n));
    const extraOnLive = [...liveNames].filter((n) => !manifestNames.has(n));
    return {
      checkedAt: new Date().toISOString(),
      address,
      ok: missingFromLive.length === 0,
      liveMethodCount: liveNames.size,
      manifestMethodCount: manifestNames.size,
      missingFromLive,
      extraOnLive,
    };
  } catch (err) {
    return {
      checkedAt: new Date().toISOString(),
      address,
      ok: false,
      liveMethodCount: 0,
      manifestMethodCount: manifestNames.size,
      missingFromLive: [...manifestNames],
      extraOnLive: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getMethodSpec(name: string): MethodSpec | undefined {
  return CONTRACT_METHODS.find((m) => m.name === name);
}
