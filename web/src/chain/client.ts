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
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Wallet rejected the connection request: ${message}`);
  }
  if (!Array.isArray(accounts) || accounts.length === 0 || typeof accounts[0] !== "string") {
    throw new Error("Wallet returned no accounts. Unlock the wallet and try again.");
  }
  const address = accounts[0] as Address;

  const writeClient = getWriteClient(address, provider);
  try {
    await writeClient.connect("studionet");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Wallet is connected but could not be switched to StudioNet (chain 61999): ${message}`
    );
  }

  return { address, provider };
}
