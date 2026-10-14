/**
 * genlayer-js@1.1.8 client wrappers.
 *
 * Every signature below is copied from the installed package's own type
 * declarations (node_modules/genlayer-js/dist/index.d.ts and
 * index-C3Ul1Rte.d.ts) and its README's "Using with a wallet provider
 * (MetaMask)" section, not from memory or the build brief's prose — the
 * brief itself warns "do not guess signatures."
 *
 * Pattern used here, verbatim from the README: a read client with no
 * account/provider for all `readContract`/`getTransaction` calls, and a
 * separate write client created only once a wallet account is known,
 * carrying `account` + `provider: window.ethereum`.
 */
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Address } from "viem";

export interface EthereumProviderLike {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProviderLike;
  }
}

/**
 * Extracts a human-readable message from any thrown value. Real `Error`
 * instances are the easy case, but EIP-1193 provider errors (e.g. a
 * rejected `wallet_switchEthereumChain`/`wallet_addEthereumChain` call from
 * MetaMask) are commonly plain objects shaped like `{ code, message, data }`,
 * not `Error` instances — `String(err)` on those degrades to the useless
 * `"[object Object]"` and silently discards the actual reason. This checks
 * for a `message` field first, then falls back to `JSON.stringify` (which at
 * least surfaces the object's real contents) before the last-resort
 * `String()` conversion.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      const maybeCode = (err as { code?: unknown }).code;
      return typeof maybeCode === "number" || typeof maybeCode === "string"
        ? `${maybeMessage} (code ${maybeCode})`
        : maybeMessage;
    }
    try {
      return JSON.stringify(err);
    } catch {
      // fall through to String() below — e.g. a circular or BigInt-bearing object
    }
  }
  return String(err);
}

let cachedReadClient: ReturnType<typeof createClient> | null = null;

/** A client for reads only — never carries a signer, never prompts a wallet. */
export function getReadClient() {
  if (!cachedReadClient) {
    cachedReadClient = createClient({ chain: studionet });
  }
  return cachedReadClient;
}

/**
 * A client for writes — carries the connected wallet's account and the
 * injected EIP-1193 provider, exactly as genlayer-js's README documents.
 * A fresh client is created per connected account rather than cached,
 * since the account can change between wallet sessions.
 */
export function getWriteClient(account: Address, provider: EthereumProviderLike) {
  return createClient({ chain: studionet, account, provider });
}

/** True only if a browser extension injected an EIP-1193 provider (e.g. MetaMask). */
export function hasInjectedProvider(): boolean {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

export interface WalletConnection {
  address: Address;
  provider: EthereumProviderLike;
}

/**
 * Requests account access from the injected provider and switches it to the
 * studionet chain via genlayer-js's own `client.connect()` (which, per the
 * README, "adds the network if not present" rather than assuming it already
 * exists in the wallet). Throws a descriptive error on every known failure
 * mode instead of silently reporting a fake success.
 */
export async function connectWallet(): Promise<WalletConnection> {
  if (!hasInjectedProvider()) {
    throw new Error(
      "No injected wallet provider found (window.ethereum is undefined). Install a browser " +
        "wallet extension such as MetaMask and reload this page."
    );
  }
  const provider = window.ethereum as EthereumProviderLike;

  let accounts: unknown;
  try {
    accounts = await provider.request({ method: "eth_requestAccounts" });
  } catch (err) {
    throw new Error(`Wallet rejected the connection request: ${describeError(err)}`);
  }
  if (!Array.isArray(accounts) || accounts.length === 0 || typeof accounts[0] !== "string") {
    throw new Error("Wallet returned no accounts. Unlock the wallet and try again.");
  }
  const address = accounts[0] as Address;

  const writeClient = getWriteClient(address, provider);
  try {
    await writeClient.connect("studionet");
  } catch (err) {
    throw new Error(
      `Wallet is connected but could not be switched to StudioNet (chain 61999): ${describeError(err)}`
    );
  }

  return { address, provider };
}
