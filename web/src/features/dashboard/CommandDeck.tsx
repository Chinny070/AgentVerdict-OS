import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ConfigGate } from "../../components/ConfigGate";
import { reads, type ProtocolStatsView } from "../../chain/contract";
import { useContractRead } from "../../hooks/useContractRead";
import { useContractAddress } from "../../state/ContractAddressContext";
import { SkeletonLines } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { getBookmarks } from "../../state/localRegistry";
import { CopyHash } from "../../components/CopyHash";

function StatsPanel() {
  const { address } = useContractAddress();
  const fetcher = useCallback((addr: `0x${string}`) => reads.getProtocolStats(addr), []);
  const state = useContractRead<ProtocolStatsView>(fetcher, [address]);

  if (state.status === "loading") return <SkeletonLines count={4} />;
  if (state.status === "error") {
    return (
      <div className="panel" role="alert">
        <p>Could not read protocol stats: {state.error}</p>
        <button className="btn btn-ghost btn-sm" onClick={state.refresh}>
          Retry
        </button>
      </div>
    );
  }
  if (state.status !== "ready") return null;

  const s = state.data;
  return (
    <div className="grid grid-3">
      <div className="metric panel">
        <span className="metric-label">Agreements</span>
        <span className="metric-value">{s.agreement_count}</span>
      </div>
      <div className="metric panel">
        <span className="metric-label">Evidence packets</span>
        <span className="metric-value">{s.evidence_count}</span>
      </div>
      <div className="metric panel">
        <span className="metric-label">Challenges</span>
        <span className="metric-value">{s.challenge_count}</span>
      </div>
      <div className="metric panel">
        <span className="metric-label">Settlements</span>
        <span className="metric-value">{s.settlement_count}</span>
      </div>
      <div className="metric panel">
        <span className="metric-label">Delegations</span>
        <span className="metric-value">{s.delegation_count}</span>
      </div>
      <div className="panel">
        <span className="field-help">Protocol admin</span>
        <div style={{ marginTop: 6 }}>
          <CopyHash value={s.admin} />
        </div>
      </div>
    </div>
  );
}

export default function CommandDeck() {
  const bookmarkedAgreements = getBookmarks("agreements");

  return (
    <div>
      <h1>Command Deck</h1>
      <p className="field-help">
        Wallet, network, live contract address, and protocol health — all real chain reads once a contract
        address is configured. Nothing on this screen is fabricated.
      </p>

      <ConfigGate>
        <StatsPanel />

        <h2 style={{ marginTop: "var(--space-6)" }}>Your bookmarked agreements</h2>
        <p className="field-help">
          This list comes from this browser's local bookmarks only (see state/localRegistry.ts) — the contract
          exposes no "list all agreements" view, so there is no protocol-wide index to show here.
        </p>
        {bookmarkedAgreements.length === 0 ? (
          <EmptyState
            icon="◇"
            title="No bookmarked agreements yet"
            description="Create one in Agreement Forge, or open an existing agreement by ID there to bookmark it."
            action={
              <Link to="/agreements" className="btn btn-primary btn-sm">
                Go to Agreement Forge
              </Link>
            }
          />
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {bookmarkedAgreements.map((id) => (
              <li key={id} className="mono-chip" style={{ marginRight: 8, marginBottom: 8 }}>
                <Link to={`/agreements?id=${encodeURIComponent(id)}`}>{id}</Link>
              </li>
            ))}
          </ul>
        )}
      </ConfigGate>
    </div>
  );
}
