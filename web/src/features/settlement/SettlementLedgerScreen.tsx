import { useCallback, useState } from "react";
import { ConfigGate } from "../../components/ConfigGate";
import { IdPicker } from "../../components/IdPicker";
import { SettlementLedgerPanel } from "../../components/SettlementLedgerPanel";
import { TxProgress } from "../../components/TxProgress";
import { SkeletonLines } from "../../components/Skeleton";
import { useContractAddress } from "../../state/ContractAddressContext";
import { useWallet } from "../../state/WalletContext";
import { useToast } from "../../state/ToastContext";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, writes, type AgreementView, type SettlementView } from "../../chain/contract";
import type { TxUpdate } from "../../chain/transactions";

export default function SettlementLedgerScreen() {
  const { address } = useContractAddress();
  const { wallet } = useWallet();
  const toast = useToast();

  const [agreementId, setAgreementId] = useState("");
  const agreementFetcher = useCallback((a: `0x${string}`) => reads.getAgreement(a, agreementId), [agreementId]);
  const agreementState = useContractRead<AgreementView>(agreementId ? agreementFetcher : null, [agreementId]);

  const settlementFetcher = useCallback((a: `0x${string}`) => reads.getSettlement(a, agreementId), [agreementId]);
  const settlementState = useContractRead<SettlementView>(agreementId ? settlementFetcher : null, [agreementId]);

  const [update, setUpdate] = useState<TxUpdate | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (label: string, fn: () => Promise<TxUpdate>) => {
    if (!wallet || !address) return toast.push("error", "Connect a wallet and configure a contract address.");
    setBusy(true);
    try {
      const result = await fn();
      setUpdate(result);
      toast.push(
        result.phase === "FAILED" ? "error" : "success",
        result.phase === "FAILED" ? `${label} failed: ${result.error}` : `${label} confirmed.`
      );
      if (result.phase !== "FAILED") {
        agreementState.refresh();
        settlementState.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const canAuthorize = agreementState.status === "ready" && agreementState.data.state === "FINALIZED";
  const canRecord = settlementState.status === "ready" && settlementState.data.status === "AUTHORIZED";

  return (
    <div>
      <h1>Settlement Ledger</h1>
      <p className="field-help">Authorized vs. executed, clearly differentiated — and both are receipts, not payments.</p>

      <ConfigGate>
        <IdPicker kind="agreements" label="Agreement ID" placeholder="A-1" value={agreementId} onChange={setAgreementId} />

        {agreementId && agreementState.status === "loading" && <SkeletonLines count={3} />}
        {agreementId && settlementState.status === "ready" && (
          <SettlementLedgerPanel settlement={settlementState.data} />
        )}
        {agreementId && settlementState.status === "error" && (
          <div className="panel">
            <p className="field-help">{settlementState.error}</p>
          </div>
        )}

        {agreementId && (
          <div className="panel" style={{ marginTop: 12 }}>
            <h3>Actions</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={!wallet || busy || !canAuthorize}
                onClick={() => run("Authorize settlement", () => writes.authorizeSettlement({ wallet: wallet!, address: address as `0x${string}`, onUpdate: setUpdate }, agreementId))}
              >
                Authorize settlement
              </button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!wallet || busy || !canRecord}
                onClick={() => run("Record settlement", () => writes.recordSettlement({ wallet: wallet!, address: address as `0x${string}`, onUpdate: setUpdate }, agreementId))}
              >
                Record settlement (mark EXECUTED)
              </button>
            </div>
            <p className="field-help" style={{ marginTop: 8 }}>
              "Authorize" requires the agreement to be FINALIZED with a PASS/PARTIAL decision. "Record" only
              flips an AUTHORIZED settlement to EXECUTED — if native transfer is ever enabled, this call will
              honestly fail with an unverified-stub error rather than pretend funds moved (see
              contracts/agentverdict.py `record_settlement`).
            </p>
            <TxProgress update={update} />
          </div>
        )}
      </ConfigGate>
    </div>
  );
}
