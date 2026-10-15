import { useCallback } from "react";
import { ConfigGate } from "../../components/ConfigGate";
import { ContractEventFeed } from "../../components/ContractEventFeed";
import { SkeletonLines } from "../../components/Skeleton";
import { useContractAddress } from "../../state/ContractAddressContext";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, type ProtocolStatsView } from "../../chain/contract";
import { CopyHash } from "../../components/CopyHash";

export default function ProtocolTelemetry() {
  const { address } = useContractAddress();
  const fetcher = useCallback((a: `0x${string}`) => reads.getProtocolStats(a), []);
  const state = useContractRead<ProtocolStatsView>(fetcher, [address]);

  return (
    <div>
      <h1>Protocol Telemetry</h1>
      <p className="field-help">
        Reads actual counters from the selected on-chain contract. It never seeds a fabricated
        transaction or activity feed.
      </p>

      <ConfigGate>
        {state.status === "loading" && <SkeletonLines count={5} />}
        {state.status === "error" && (
          <div className="panel" role="alert">
            <p>{state.error}</p>
            <button className="btn btn-ghost btn-sm" onClick={state.refresh}>
              Retry
            </button>
          </div>
        )}
        {state.status === "ready" && (
          <>
            <div className="grid grid-3">
              <div className="metric panel">
                <span className="metric-label">Agreements</span>
                <span className="metric-value">{state.data.agreement_count}</span>
              </div>
              <div className="metric panel">
                <span className="metric-label">Evidence</span>
                <span className="metric-value">{state.data.evidence_count}</span>
              </div>
              <div className="metric panel">
                <span className="metric-label">Delegations</span>
                <span className="metric-value">{state.data.delegation_count}</span>
              </div>
              <div className="metric panel">
                <span className="metric-label">Challenges</span>
                <span className="metric-value">{state.data.challenge_count}</span>
              </div>
              <div className="metric panel">
                <span className="metric-label">Settlements</span>
                <span className="metric-value">{state.data.settlement_count}</span>
              </div>
              <div className="metric panel">
                <span className="metric-label">Reputation events</span>
                <span className="metric-value">{state.data.reputation_event_count}</span>
              </div>
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <h3>Settlement native transfer</h3>
              <p>
                <span
                  className={`badge ${state.data.settlement_native_transfer_enabled ? "badge-failed" : "badge-confirmed"}`}
                >
                  {state.data.settlement_native_transfer_enabled ? "ENABLED (unverified stub)" : "DISABLED (safe default)"}
                </span>
              </p>
              <h3 style={{ marginTop: 12 }}>Admin</h3>
              <CopyHash value={state.data.admin} />
            </div>

            <div style={{ marginTop: 16 }}>
              <ContractEventFeed stats={state.data} onRefresh={state.refresh} />
            </div>
          </>
        )}
      </ConfigGate>
    </div>
  );
}
