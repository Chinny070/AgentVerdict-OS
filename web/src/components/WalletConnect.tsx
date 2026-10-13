import { useWallet } from "../state/WalletContext";
import { shortenAddress } from "../chain/config";

export function WalletConnect() {
  const { wallet, connecting, error, hasProvider, connect, disconnect } = useWallet();

  if (wallet) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mono-chip" title={wallet.address}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mint)" }} />
          {shortenAddress(wallet.address)}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button className="btn btn-primary btn-sm" onClick={connect} disabled={connecting} aria-busy={connecting}>
        {connecting ? "Connecting…" : hasProvider ? "Connect wallet" : "No wallet detected"}
      </button>
      {!hasProvider && (
        <span className="field-help" style={{ maxWidth: 220, textAlign: "right" }}>
          No injected EIP-1193 provider (window.ethereum). Install MetaMask or a compatible wallet
          extension and reload.
        </span>
      )}
      {error && (
        <span className="field-help" role="alert" style={{ color: "var(--coral)", maxWidth: 260, textAlign: "right" }}>
          {error}
        </span>
      )}
    </div>
  );
}
