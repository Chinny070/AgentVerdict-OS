import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  getConfiguredContractAddress,
  isLikelyAddress,
  isUsingDefaultContractAddress,
  resetToDefaultContractAddress,
  setConfiguredContractAddress,
} from "../chain/config";

interface ContractAddressState {
  address: string | null;
  isConfigured: boolean;
  /** True when `address` is this app's built-in default (Stage 11), not an
   *  explicit user override. */
  isDefault: boolean;
  setAddress: (next: string) => { ok: boolean; error?: string };
  /** Explicitly opts out of the default, showing the honest "no contract
   *  configured" state again. */
  clearAddress: () => void;
  /** Removes any override/opt-out and falls back to the built-in default
   *  (Stage 11). */
  resetToDefault: () => void;
}

const ContractAddressContext = createContext<ContractAddressState | null>(null);

export function ContractAddressProvider({ children }: { children: ReactNode }) {
  const [address, setAddressState] = useState<string | null>(() => getConfiguredContractAddress());

  const setAddress = useCallback((next: string) => {
    const trimmed = next.trim();
    if (!isLikelyAddress(trimmed)) {
      return { ok: false, error: "Not a valid 0x-prefixed 20-byte address." };
    }
    setConfiguredContractAddress(trimmed);
    setAddressState(trimmed);
    return { ok: true };
  }, []);

  const clearAddress = useCallback(() => {
    setConfiguredContractAddress(null);
    setAddressState(null);
  }, []);

  const resetToDefault = useCallback(() => {
    resetToDefaultContractAddress();
    setAddressState(getConfiguredContractAddress());
  }, []);

  const value = useMemo<ContractAddressState>(
    () => ({
      address,
      isConfigured: Boolean(address),
      isDefault: Boolean(address) && isUsingDefaultContractAddress(),
      setAddress,
      clearAddress,
      resetToDefault,
    }),
    [address, setAddress, clearAddress, resetToDefault]
  );

  return <ContractAddressContext.Provider value={value}>{children}</ContractAddressContext.Provider>;
}

export function useContractAddress(): ContractAddressState {
  const ctx = useContext(ContractAddressContext);
  if (!ctx) throw new Error("useContractAddress() must be used within <ContractAddressProvider>");
  return ctx;
}
