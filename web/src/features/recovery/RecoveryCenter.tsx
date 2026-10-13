import { useCallback, useState } from "react";
import { ConfigGate } from "../../components/ConfigGate";
import { IdPicker } from "../../components/IdPicker";
import { RecoveryPanel } from "../../components/RecoveryPanel";
import { TxProgress } from "../../components/TxProgress";
import { SkeletonLines } from "../../components/Skeleton";
import { useContractAddress } from "../../state/ContractAddressContext";
import { useWallet } from "../../state/WalletContext";
import { useToast } from "../../state/ToastContext";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, writes, type AgreementView, type VerdictView } from "../../chain/contract";
import type { TxUpdate } from "../../chain/transactions";

export default function RecoveryCenter() {
  const { address } = useContractAddress();
  const { wallet } = useWallet();
  const toast = useToast();

  const [agreementId, setAgreementId] = useState("");
  const [reason, setReason] = useState("");
  const [update, setUpdate] = useState<TxUpdate | null>(null);
  const [busy, setBusy] = useState(false);

  const agreementFetcher = useCallback((a: `0x${string}`) => reads.getAgreement(a, agreementId), [agreementId]);
  const agreementState = useContractRead<AgreementView>(agreementId ? agreementFetcher : null, [agreementId]);
  const verdictFetcher = useCallback((a: `0x${string}`) => reads.getVerdict(a, agreementId), [agreementId]);
  const verdictState = useContractRead<VerdictView>(agreementId ? verdictFetcher : null, [agreementId]);

  const guard = () => {
    if (!wallet || !address) {
      toast.push("error", "Connect a wallet and configure a contract address.");
      return null;
    }
    return { wallet, address: address as `0x${string}`, onUpdate: setUpdate };
  };

  const run = async (label: string, fn: () => Promise<TxUpdate>) => {
    setBusy(true);
    try {
      const result = await fn();
      setUpdate(result);
      toast.push(result.phase === "FAILED" ? "error" : "success", result.phase === "FAILED" ? `${label} failed: ${result.error}` : `${label} confirmed.`);
      if (result.phase !== "FAILED") {
        agreementState.refresh();
        verdictState.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>Recovery Center</h1>
      <p className="field-help">Rework, partial completion, and termination — feature 5, Autonomous Recovery Engine.</p>

      <ConfigGate>
        <IdPicker kind="agreements" label="Agreement ID" placeholder="A-1" value={agreementId} onChange={setAgreementId} />

        {agreementId && agreementState.status === "loading" && <SkeletonLines count={4} />}
        {agreementId && agreementState.status === "error" && <p role="alert">{agreementState.error}</p>}
        {agreementId && agreementState.status === "ready" && (
          <RecoveryPanel
            agreement={agreementState.data}
            verdict={verdictState.status === "ready" ? verdictState.data : null}
            busy={busy}
            onRequestRework={() => {
              const opts = guard();
              if (opts) run("Request rework", () => writes.requestRework(opts, agreementId, reason));
            }}
            onAcknowledgeRecovery={() => {
              const opts = guard();
              if (opts) run("Acknowledge recovery", () => writes.acknowledgeRecovery(opts, agreementId));
            }}
            onTerminate={() => {
              const opts = guard();
              if (opts) run("Terminate", () => writes.terminateAgreement(opts, agreementId, reason));
            }}
          />
        )}

        <div className="panel" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="reason">Reason / notes (used for rework and termination calls)</label>
            <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <TxProgress update={update} />
        </div>
      </ConfigGate>
    </div>
  );
}
