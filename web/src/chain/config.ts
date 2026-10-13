/**
 * Centralized chain/address/network configuration.
 *
 * Verified against the installed genlayer-js@1.1.8 package (not memory):
 * - `genlayer-js/chains` exports a built-in `studionet` chain object with
 *   `id: 61999` and RPC `https://studio.genlayer.com/api`
 *   (node_modules/genlayer-js/dist/chunk-XCQTIUTU.js, `SIMULATOR_JSON_RPC_URL2`).
 * - This matches docs/GENLAYER_CAPABILITY_MATRIX.md section 1, which was
 *   independently verified against live GenLayer docs in Stage 0.
 *
 * Per the build brief section 10: "centralize address/ABI/schema and chain
 * metadata in typed config; no hardcoded fabricated address." The deployed
 * contract address is NOT hardcoded here — it is empty until a human with a
 * signing key deploys the contract and fills it in, either via
 * VITE_CONTRACT_ADDRESS at build time or via the Settings screen at runtime
 * (stored in localStorage as a client-only preference, never treated as
 * canonical protocol state).
 */

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_RPC_URL = "https://studio.genlayer.com/api";
export const STUDIONET_EXPLORER_URL = "https://explorer-studio.genlayer.com";
export const GENLAYER_JS_VERSION = "1.1.8";

const LOCAL_STORAGE_ADDRESS_KEY = "agentverdict:contractAddress";
const LOCAL_STORAGE_NETWORK_KEY = "agentverdict:network";

export type SupportedNetwork = "studionet";

/**
 * Reads the contract address the user/operator has configured.
 *
 * Resolution order: an explicit runtime override saved via the Settings
 * screen (localStorage) takes precedence over the build-time
 * VITE_CONTRACT_ADDRESS env var, so a deployer can point a static build at a
 * freshly deployed address without rebuilding. Neither source is treated as
 * canonical chain state — it is only "which address should this browser
 * talk to", exactly like a wallet's "custom RPC" field.
 */
export function getConfiguredContractAddress(): string | null {
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_ADDRESS_KEY);
    if (stored && isLikelyAddress(stored)) return stored;
  } catch {
    // localStorage unavailable (private browsing, disabled storage, etc.)
  }
  const fromEnv = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim();
  return fromEnv && isLikelyAddress(fromEnv) ? fromEnv : null;
}

export function setConfiguredContractAddress(address: string | null): void {
  try {
    if (!address) {
      window.localStorage.removeItem(LOCAL_STORAGE_ADDRESS_KEY);
    } else {
      window.localStorage.setItem(LOCAL_STORAGE_ADDRESS_KEY, address);
    }
  } catch {
    // Non-fatal: the value just won't persist across reloads.
  }
}

export function getConfiguredNetwork(): SupportedNetwork {
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_NETWORK_KEY);
    if (stored === "studionet") return stored;
  } catch {
    // ignore
  }
  return "studionet";
}

export function isLikelyAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

export function shortenAddress(address: string, chars = 4): string {
  if (!isLikelyAddress(address)) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}
