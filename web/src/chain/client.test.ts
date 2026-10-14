import { describe, expect, it } from "vitest";
import { describeError } from "./client";

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
