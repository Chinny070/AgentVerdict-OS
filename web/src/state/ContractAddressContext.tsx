import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  getConfiguredContractAddress,
  isLikelyAddress,
  setConfiguredContractAddress,
} from "../chain/config";

interface ContractAddressState {
  address: string | null;
  isConfigured: boolean;
  setAddress: (next: string) => { ok: boolean; error?: string };
  clearAddress: () => void;
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

  const value = useMemo<ContractAddressState>(
    () => ({ address, isConfigured: Boolean(address), setAddress, clearAddress }),
    [address, setAddress, clearAddress]
  );

  return <ContractAddressContext.Provider value={value}>{children}</ContractAddressContext.Provider>;
}

export function useContractAddress(): ContractAddressState {
  const ctx = useContext(ContractAddressContext);
  if (!ctx) throw new Error("useContractAddress() must be used within <ContractAddressProvider>");
  return ctx;
}
