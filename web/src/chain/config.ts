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

/**
 * V2 — the current, actively-used, Stage-6-fixed deployment (has
 * resolve_challenge_by_timeout and the storage-pickling fix; every public
 * write method has been exercised live at least once — see
 * docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md and
 * docs/V2_REMAINING_PATHS_VERIFICATION_REPORT.md). This is a REAL deployed
 * address, not a placeholder — see deployments/studionet.json. Used as the
 * default target for new interactions unless overridden.
 */
export const V2_CONTRACT_ADDRESS = "0xCC67216ceD224A971739bAA706142A740B31853C";

/**
 * V1 — the original Stage 0-4 deployment, pre-Stage-6-fix. Historical,
 * read-only: it has two finalized agreements (A-1, A-2) as evidence, but
 * lacks the challenge-timeout-recovery fix and the storage-pickling fix.
 * Kept queryable (never hidden or deleted) but no longer the default target
 * for new interactions. See docs/STUDIONET_LIVE_VERIFICATION_REPORT.md.
 */
export const V1_CONTRACT_ADDRESS = "0xb222305575ee8af1255d8aCd196280b405B54Baf";

/** @deprecated use V2_CONTRACT_ADDRESS */
export const DEFAULT_CONTRACT_ADDRESS = V2_CONTRACT_ADDRESS;

const LOCAL_STORAGE_ADDRESS_KEY = "agentverdict:contractAddress";
const LOCAL_STORAGE_NETWORK_KEY = "agentverdict:network";
/** Sentinel stored in localStorage to record an EXPLICIT user opt-out of the
 *  default address (distinct from "never configured", which falls back to
 *  the default). Lets a user deliberately see the "no contract configured"
 *  empty state again, e.g. to disconnect from StudioNet entirely. */
const NONE_SENTINEL = "__none__";

export type SupportedNetwork = "studionet";

/**
 * Reads the contract address the user/operator has configured.
 *
 * Resolution order: an explicit runtime override saved via the Settings
 * screen (localStorage) takes precedence over the build-time
 * VITE_CONTRACT_ADDRESS env var, which takes precedence over this app's
 * built-in default (the live V2 deployment, see V2_CONTRACT_ADDRESS above).
 * A user can still explicitly opt out of the default (storing the "none"
 * sentinel via clearAddress()) to see the honest "no contract configured"
 * state again. Nothing here is fabricated — V2 is a real, live, deployed
 * contract, so defaulting to it is not the same as hardcoding a fake
 * address; it is simply picking the real current deployment as a sensible
 * out-of-the-box default instead of requiring every visitor to paste it in
 * manually.
 */
export function getConfiguredContractAddress(): string | null {
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_ADDRESS_KEY);
    if (stored === NONE_SENTINEL) return null;
    if (stored && isLikelyAddress(stored)) return stored;
  } catch {
    // localStorage unavailable (private browsing, disabled storage, etc.)
  }
  const fromEnv = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim();
  if (fromEnv && isLikelyAddress(fromEnv)) return fromEnv;
  return V2_CONTRACT_ADDRESS;
}

/** True when the address currently in effect is this app's built-in default
 *  (i.e. the user has not explicitly configured an override or opted out). */
export function isUsingDefaultContractAddress(): boolean {
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_ADDRESS_KEY);
    if (stored) return false;
  } catch {
    // ignore
  }
  const fromEnv = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim();
  return !(fromEnv && isLikelyAddress(fromEnv));
}

export function setConfiguredContractAddress(address: string | null): void {
  try {
    if (!address) {
      window.localStorage.setItem(LOCAL_STORAGE_ADDRESS_KEY, NONE_SENTINEL);
    } else {
      window.localStorage.setItem(LOCAL_STORAGE_ADDRESS_KEY, address);
    }
  } catch {
    // Non-fatal: the value just won't persist across reloads.
  }
}

/** Resets to this app's built-in default (V2) by removing any stored
 *  override or opt-out, rather than explicitly opting out. */
export function resetToDefaultContractAddress(): void {
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_ADDRESS_KEY);
  } catch {
    // ignore
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
