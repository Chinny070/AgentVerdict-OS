import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

const mocks = vi.hoisted(() => ({ writeContract: vi.fn(), waitForTransactionReceipt: vi.fn() }));
vi.mock("./client", () => ({
  STUDIONET_EVM_CHAIN_ID: "0xf22f",
  describeError: (err: unknown) => err instanceof Error ? err.message : String(err),
  getWriteClient: () => ({ writeContract: mocks.writeContract }),
  getReadClient: () => ({ waitForTransactionReceipt: mocks.waitForTransactionReceipt }),
}));

import { runWrite } from "./transactions";

const account = "0x1234567890123456789012345678901234567890" as const;
const address = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const;

function provider(chainId: string, accounts: string[]) {
  return { request: vi.fn(async ({ method }: { method: string }) => method === "eth_chainId" ? chainId : accounts) };
}

describe("runWrite finality and wallet safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writeContract.mockResolvedValue(`0x${"1".repeat(64)}`);
    mocks.waitForTransactionReceipt.mockResolvedValue({
      status: TransactionStatus.FINALIZED,
      statusName: TransactionStatus.FINALIZED,
      txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
    });
  });

  it("blocks writes before opening a signer on the wrong network", async () => {
    const p = provider("0x1", [account]);
    const result = await runWrite({ account, provider: p, address, functionName: "create_agreement" });
    expect(result.phase).toBe("FAILED");
    expect(result.error).toMatch(/StudioNet/);
    expect(mocks.writeContract).not.toHaveBeenCalled();
  });

  it("blocks a stale account before signing", async () => {
    const result = await runWrite({ account, provider: provider("0xf22f", ["0x9999999999999999999999999999999999999999"]), address, functionName: "create_agreement" });
    expect(result.phase).toBe("FAILED");
    expect(result.error).toMatch(/account changed/i);
    expect(mocks.writeContract).not.toHaveBeenCalled();
  });

  it("reports success only after a finalized successful execution receipt", async () => {
    const result = await runWrite({ account, provider: provider("0xf22f", [account]), address, functionName: "create_agreement" });
    expect(result.phase).toBe("FINALIZED");
    expect(mocks.waitForTransactionReceipt).toHaveBeenCalledWith(expect.objectContaining({ status: TransactionStatus.FINALIZED }));
  });

  it("rejects a finalized transaction whose contract execution failed", async () => {
    mocks.waitForTransactionReceipt.mockResolvedValue({ statusName: TransactionStatus.FINALIZED, txExecutionResultName: ExecutionResult.FINISHED_WITH_ERROR });
    const result = await runWrite({ account, provider: provider("0xf22f", [account]), address, functionName: "create_agreement" });
    expect(result.phase).toBe("FAILED");
    expect(result.error).toMatch(/execution failed on-chain/i);
  });
});
