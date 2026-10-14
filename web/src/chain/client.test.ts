import { afterEach, describe, expect, it } from "vitest";
import { connectWallet, describeError } from "./client";

function installFakeProvider(requestImpl: (args: { method: string }) => Promise<unknown>) {
  (window as unknown as { ethereum?: unknown }).ethereum = {
    isMetaMask: false,
    request: requestImpl,
    on: () => {},
    removeListener: () => {},
  };
}

describe("describeError", () => {
  it("extracts the message from a real Error instance", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });

  it("extracts .message from a plain EIP-1193-style error object instead of stringifying it", () => {
    // MetaMask's wallet_switchEthereumChain/wallet_addEthereumChain rejections
    // are commonly shaped like this -- not real Error instances. Naively
    // calling String(err) on an object degrades to "[object Object]" and
    // silently throws away the actual reason, which is the bug this guards.
    const err = { code: 4902, message: "Unrecognized chain ID" };
    const result = describeError(err);
    expect(result).not.toBe("[object Object]");
    expect(result).toContain("Unrecognized chain ID");
    expect(result).toContain("4902");
  });

  it("falls back to JSON.stringify for an object with no usable .message", () => {
    const result = describeError({ foo: "bar" });
    expect(result).not.toBe("[object Object]");
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("handles a plain string throw", () => {
    expect(describeError("plain string reason")).toBe("plain string reason");
  });
});

describe("connectWallet", () => {
  afterEach(() => {
    delete (window as unknown as { ethereum?: unknown }).ethereum;
  });

  it("gives a specific, actionable error when the wallet lacks MetaMask Snaps support", async () => {
    // Reproduces the real failure confirmed live with Rabby Wallet: generic
    // EIP-1193 calls succeed, but wallet_getSnaps (a MetaMask-proprietary
    // method genlayer-js@1.1.8's connect() unconditionally depends on)
    // rejects with a standard JSON-RPC "method not found" shape.
    installFakeProvider(async ({ method }) => {
      if (method === "eth_requestAccounts") {
        return ["0x1234567890123456789012345678901234567890"];
      }
      if (method === "wallet_getSnaps") {
        const err = new Error(
          "The method [wallet_getSnaps] doesn't have a corresponding handler."
        ) as Error & { code: number };
        err.code = -32601;
        throw err;
      }
      throw new Error(`unexpected method in test: ${method}`);
    });

    await expect(connectWallet()).rejects.toThrow(/does not support MetaMask Snaps/i);
    await expect(connectWallet()).rejects.toThrow(/MetaMask/);
  });

  it("surfaces an unrecognized wallet_getSnaps failure honestly instead of misdiagnosing it", async () => {
    installFakeProvider(async ({ method }) => {
      if (method === "eth_requestAccounts") {
        return ["0x1234567890123456789012345678901234567890"];
      }
      if (method === "wallet_getSnaps") {
        throw new Error("some unrelated provider failure");
      }
      throw new Error(`unexpected method in test: ${method}`);
    });

    await expect(connectWallet()).rejects.toThrow(/Could not check wallet Snap support/i);
  });
});
