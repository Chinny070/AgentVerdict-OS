/**
 * Transaction lifecycle tracking.
 *
 * GenLayer's own consensus status (`TransactionStatus`, from
 * genlayer-js@1.1.8's real runtime enum) is distinct from this protocol's
 * business lifecycle (DRAFT/PROPOSED/.../FINALIZED, defined in
 * contracts/agentverdict.py). This module tracks the FIRST kind — "what is
 * happening to the write I just sent" — so the UI never conflates "the
 * transaction reached consensus" with "the agreement reached FINALIZED".
 *
 * No screen may claim a write succeeded without an actual transaction
 * receipt. `runWrite` below only ever reports SUCCEEDED after
 * `waitForTransactionReceipt` returns a receipt whose execution result is
 * successful. StudioNet 1.1.8 may provide that result only in the simplified
 * `consensus_data.leader_receipt[].execution_result` field ("SUCCESS" or
 * "ERROR"), rather than the top-level `txExecutionResultName` used on other
 * network transports. StudioNet can also include a validator row cancelled
 * after quorum (`CONSENSUS_VALIDATOR_QUORUM_REACHED`); that row is not a
 * competing execution outcome. A consensus status alone is never treated as
 * success.
 */
import { ExecutionResult, TransactionStatus, transactionsStatusNumberToName } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import type { Address } from "viem";
import { describeError, getReadClient, getWriteClient, STUDIONET_EVM_CHAIN_ID, type EthereumProviderLike } from "./client";

export type TxPhase =
  | "IDLE"
  | "WALLET_CONFIRM"
  | "SUBMITTED"
  | "PROCESSING"
  | "ACCEPTED"
  | "FINALIZED"
  | "FAILED";

export interface TxUpdate {
  phase: TxPhase;
  hash?: `0x${string}`;
  consensusStatus?: TransactionStatus;
  executionResult?: ExecutionResult;
  error?: string;
  returnValue?: unknown;
}

export interface RunWriteArgs {
  account: Address;
  provider: EthereumProviderLike;
  address: Address;
  functionName: string;
  args?: unknown[];
  waitForFinalized?: boolean;
  onUpdate?: (update: TxUpdate) => void;
}

/**
 * Sends a write transaction and tracks it through to a real, verified
 * result. Every emitted TxUpdate reflects an actual SDK response — never an
 * optimistic guess. Resolves with the final TxUpdate; callers should treat
 * `phase !== "FINALIZED" && phase !== "ACCEPTED"` or a present `error` as
 * "did not succeed."
 */
export async function runWrite(args: RunWriteArgs): Promise<TxUpdate> {
  const { account, provider, address, functionName, args: callArgs = [], onUpdate } = args;
  const emit = (u: TxUpdate) => onUpdate?.(u);

  try {
    const [chainId, accounts] = await Promise.all([
      provider.request({ method: "eth_chainId" }),
      provider.request({ method: "eth_accounts" }),
    ]);
    if (typeof chainId !== "string" || chainId.toLowerCase() !== STUDIONET_EVM_CHAIN_ID) {
      throw new Error("Wallet is not on StudioNet (chain ID 61999). Switch networks and reconnect before writing.");
    }
    if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || accounts[0].toLowerCase() !== account.toLowerCase()) {
      throw new Error("The connected wallet account changed. Reconnect before writing.");
    }
  } catch (err) {
    const update: TxUpdate = { phase: "FAILED", error: `Wallet preflight failed: ${describeError(err)}` };
    emit(update);
    return update;
  }

  emit({ phase: "WALLET_CONFIRM" });
  const writeClient = getWriteClient(account, provider);

  let hash: `0x${string}`;
  try {
    // `account` is intentionally NOT passed here: per genlayer-js's own
    // README ("Using with a wallet provider (MetaMask)"), the account is
    // bound once when the write client itself is created via
    // getWriteClient(account, provider) above, not re-passed per call.
    hash = await writeClient.writeContract({
      address,
      functionName,
      args: callArgs as never,
      value: 0n,
    });
  } catch (err) {
    const error = describeWriteError(err);
    const update: TxUpdate = { phase: "FAILED", error };
    emit(update);
    return update;
  }

  emit({ phase: "SUBMITTED", hash });
  emit({ phase: "PROCESSING", hash });

  const readClient = getReadClient();
  try {
    const receipt = await readClient.waitForTransactionReceipt({
      hash: hash as Hash,
      status: TransactionStatus.FINALIZED,
      retries: 60,
      interval: 2000,
    });

    const consensusStatus = getConsensusStatus(receipt);
    const executionResult = getExecutionResult(receipt);

    if (executionResult !== ExecutionResult.FINISHED_WITH_RETURN) {
      const update: TxUpdate = {
        phase: "FAILED",
        hash,
        consensusStatus,
        executionResult,
        error: executionResult === ExecutionResult.FINISHED_WITH_ERROR
          ? "Transaction finalized but execution failed on-chain (FINISHED_WITH_ERROR)."
          : "Transaction finalized without a confirmed successful execution result.",
      };
      emit(update);
      return update;
    }

    if (consensusStatus !== TransactionStatus.FINALIZED) {
      const update: TxUpdate = {
        phase: "FAILED", hash, consensusStatus, executionResult,
        error: "Receipt did not confirm FINALIZED consensus status.",
      };
      emit(update);
      return update;
    }
    const update: TxUpdate = { phase: "FINALIZED", hash, consensusStatus, executionResult };
    const returnValue = getSuccessfulReturnValue(receipt);
    if (returnValue !== undefined) update.returnValue = returnValue;
    emit(update);
    return update;
  } catch (err) {
    const update: TxUpdate = {
      phase: "FAILED",
      hash,
      error: `Timed out or failed waiting for the transaction receipt: ${describeError(err)}`,
    };
    emit(update);
    return update;
  }
}

/**
 * genlayer-js@1.1.8's default (simplified) receipt keeps the numeric
 * `status`, and maps the decoded enum name to `status_name`. Full transaction
 * responses can instead expose `statusName`. Normalize all documented forms
 * before enforcing finality; treating the numeric enum as a string falsely
 * rejected real finalized StudioNet writes.
 */
function getConsensusStatus(receipt: {
  status?: unknown;
  statusName?: unknown;
  status_name?: unknown;
}): TransactionStatus | undefined {
  for (const value of [receipt.statusName, receipt.status_name, receipt.status]) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") continue;
    const normalized = String(value).toUpperCase();
    if (Object.values(TransactionStatus).includes(normalized as TransactionStatus)) {
      return normalized as TransactionStatus;
    }
    const enumName = transactionsStatusNumberToName[normalized as keyof typeof transactionsStatusNumberToName];
    if (enumName) return enumName;
  }
  return undefined;
}

/** Normalize the documented SDK enum and StudioNet leader-receipt shape. */
function getExecutionResult(receipt: {
  txExecutionResultName?: ExecutionResult;
  consensus_data?: { leader_receipt?: unknown };
}): ExecutionResult | undefined {
  if (receipt.txExecutionResultName) return receipt.txExecutionResultName;

  const leaderReceipts = receipt.consensus_data?.leader_receipt;
  const rows = Array.isArray(leaderReceipts) ? leaderReceipts : leaderReceipts ? [leaderReceipts] : [];
  const results = rows
    .filter((row) => !isQuorumCancellation(row))
    .map((row) => (row && typeof row === "object" ? (row as { execution_result?: unknown }).execution_result : undefined))
    .filter((result): result is string => typeof result === "string")
    .map((result) => result.toUpperCase());

  if (results.length === 0) return undefined;
  // Refuse to infer success from inconsistent leader receipts.
  if (results.some((result) => result !== results[0])) return undefined;
  if (results[0] === "SUCCESS" || results[0] === ExecutionResult.FINISHED_WITH_RETURN) {
    return ExecutionResult.FINISHED_WITH_RETURN;
  }
  if (results[0] === "ERROR" || results[0] === ExecutionResult.FINISHED_WITH_ERROR) {
    return ExecutionResult.FINISHED_WITH_ERROR;
  }
  return undefined;
}

/**
 * StudioNet records validator executions cancelled after quorum in the same
 * leader_receipt array as the successful leader execution. Ignore only that
 * explicit runtime cancellation; a normal ERROR or conflicting result must
 * still prevent the UI from claiming success.
 */
function isQuorumCancellation(row: unknown): boolean {
  if (!row || typeof row !== "object") return false;
  const genvmResult = (row as { genvm_result?: unknown }).genvm_result;
  if (!genvmResult || typeof genvmResult !== "object") return false;
  const details = genvmResult as { error_code?: unknown; stderr?: unknown; raw_error?: { causes?: unknown } };
  if (details.error_code === "CONSENSUS_VALIDATOR_QUORUM_REACHED") return true;
  if (typeof details.stderr === "string" && /validator execution cancelled after quorum/i.test(details.stderr)) return true;
  return Array.isArray(details.raw_error?.causes) && details.raw_error.causes.includes("VALIDATOR_QUORUM_REACHED");
}

function getSuccessfulReturnValue(receipt: {
  consensus_data?: { leader_receipt?: unknown };
}): unknown {
  const leaderReceipts = receipt.consensus_data?.leader_receipt;
  const rows = Array.isArray(leaderReceipts) ? leaderReceipts : leaderReceipts ? [leaderReceipts] : [];
  const successful = rows.find((row) => {
    if (!row || typeof row !== "object" || isQuorumCancellation(row)) return false;
    const result = (row as { execution_result?: unknown }).execution_result;
    return typeof result === "string" && (result.toUpperCase() === "SUCCESS" || result === ExecutionResult.FINISHED_WITH_RETURN);
  }) as { result?: unknown } | undefined;
  if (!successful?.result || typeof successful.result !== "object") return undefined;
  const result = successful.result as { status?: unknown; payload?: unknown };
  if (result.status !== "return" || !result.payload || typeof result.payload !== "object") return undefined;
  const readable = (result.payload as { readable?: unknown }).readable;
  if (typeof readable !== "string") return undefined;
  try {
    return JSON.parse(readable) as unknown;
  } catch {
    return readable;
  }
}

function describeWriteError(err: unknown): string {
  const message = describeError(err);
  if (/user rejected/i.test(message) || /denied/i.test(message)) {
    return "Wallet rejected the transaction signature request.";
  }
  if (/chain/i.test(message) && /mismatch|wrong|different/i.test(message)) {
    return `Wallet is on the wrong network: ${message}`;
  }
  return `Write failed: ${message}`;
}

export const TX_PHASE_LABEL: Record<TxPhase, string> = {
  IDLE: "Idle",
  WALLET_CONFIRM: "Awaiting wallet signature",
  SUBMITTED: "Submitted to StudioNet",
  PROCESSING: "Leader/validator consensus in progress",
  ACCEPTED: "Accepted (optimistic)",
  FINALIZED: "Finalized",
  FAILED: "Failed",
};
