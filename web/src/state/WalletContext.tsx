import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { connectWallet, describeError, hasInjectedProvider, type WalletConnection } from "../chain/client";

interface WalletState {
  wallet: WalletConnection | null;
  connecting: boolean;
  error: string | null;
  hasProvider: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectWallet();
      setWallet(result);
    } catch (err) {
      setError(describeError(err));
      setWallet(null);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // genlayer-js/MetaMask have no programmatic "disconnect" call; this
    // only clears this app's own in-memory reference to the account, which
    // is the honest, documented limitation for EIP-1193 injected wallets.
    setWallet(null);
    setError(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ wallet, connecting, error, hasProvider: hasInjectedProvider(), connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet() must be used within <WalletProvider>");
  return ctx;
}
