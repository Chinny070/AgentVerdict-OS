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
 * `waitForTransactionReceipt` returns a receipt whose
 * `txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN` — a
 * transaction can reach ACCEPTED/FINALIZED consensus status and still have
 * a failed execution, per genlayer-js's own README warning, which this
 * code follows exactly.
 */
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import type { Address } from "viem";
import { getReadClient, getWriteClient, type EthereumProviderLike } from "./client";

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
  const { account, provider, address, functionName, args: callArgs = [], waitForFinalized = false, onUpdate } = args;
  const emit = (u: TxUpdate) => onUpdate?.(u);

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
    const targetStatus = waitForFinalized ? TransactionStatus.FINALIZED : TransactionStatus.ACCEPTED;
    const receipt = await readClient.waitForTransactionReceipt({
      hash: hash as Hash,
      status: targetStatus,
      retries: 60,
      interval: 2000,
    });

    const consensusStatus = (receipt.statusName ?? receipt.status) as TransactionStatus | undefined;
    const executionResult = receipt.txExecutionResultName as ExecutionResult | undefined;

    if (executionResult === ExecutionResult.FINISHED_WITH_ERROR) {
      const update: TxUpdate = {
        phase: "FAILED",
        hash,
        consensusStatus,
        executionResult,
        error: "Transaction reached consensus but execution failed on-chain (FINISHED_WITH_ERROR).",
      };
      emit(update);
      return update;
    }

    const phase: TxPhase =
      consensusStatus === TransactionStatus.FINALIZED ? "FINALIZED" : "ACCEPTED";
    const update: TxUpdate = { phase, hash, consensusStatus, executionResult };
    emit(update);
    return update;
  } catch (err) {
    const update: TxUpdate = {
      phase: "FAILED",
      hash,
      error: `Timed out or failed waiting for the transaction receipt: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
    emit(update);
    return update;
  }
}

function describeWriteError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
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
