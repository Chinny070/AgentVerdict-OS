import { useCallback, useState } from "react";
import { ConfigGate } from "../../components/ConfigGate";
import { IdPicker } from "../../components/IdPicker";
import { AgentPassportCard } from "../../components/AgentPassportCard";
import { DelegationGraph } from "../../components/DelegationGraph";
import { TxProgress } from "../../components/TxProgress";
import { SkeletonLines } from "../../components/Skeleton";
import { useContractAddress } from "../../state/ContractAddressContext";
import { useWallet } from "../../state/WalletContext";
import { useToast } from "../../state/ToastContext";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, writes, type AgentPassportView, type DelegationView } from "../../chain/contract";
import { addBookmark } from "../../state/localRegistry";
import type { TxUpdate } from "../../chain/transactions";

export default function AgentAtlas() {
  const { address } = useContractAddress();
  const { wallet } = useWallet();
  const toast = useToast();

  const [capabilities, setCapabilities] = useState('["evidence-submission"]');
  const [registerUpdate, setRegisterUpdate] = useState<TxUpdate | null>(null);
  const [registering, setRegistering] = useState(false);

  const [lookupAddr, setLookupAddr] = useState("");
  const passportFetcher = useCallback((a: `0x${string}`) => reads.getAgentPassport(a, lookupAddr), [lookupAddr]);
  const passportState = useContractRead<AgentPassportView>(lookupAddr ? passportFetcher : null, [lookupAddr]);

  const [delegationId, setDelegationId] = useState("");
  const delegationFetcher = useCallback((a: `0x${string}`) => reads.getDelegation(a, delegationId), [delegationId]);
  const delegationState = useContractRead<DelegationView>(delegationId ? delegationFetcher : null, [delegationId]);

  const [child, setChild] = useState("");
  const [spendCap, setSpendCap] = useState("0");
  const [expiresAt, setExpiresAt] = useState("");
  const [delegateUpdate, setDelegateUpdate] = useState<TxUpdate | null>(null);
  const [delegating, setDelegating] = useState(false);

  const handleRegister = async () => {
    if (!wallet || !address) return toast.push("error", "Connect a wallet and configure a contract address.");
    setRegistering(true);
    try {
      const result = await writes.registerAgent(
        { wallet, address: address as `0x${string}`, onUpdate: setRegisterUpdate },
        capabilities
      );
      setRegisterUpdate(result);
      toast.push(result.phase === "FAILED" ? "error" : "success", result.phase === "FAILED" ? `Register failed: ${result.error}` : "Passport registered/updated.");
    } finally {
      setRegistering(false);
    }
  };

  const handleDelegate = async () => {
    if (!wallet || !address) return toast.push("error", "Connect a wallet and configure a contract address.");
    setDelegating(true);
    try {
      const deadlineIso = expiresAt ? new Date(expiresAt).toISOString() : "";
      const result = await writes.delegateScope(
        { wallet, address: address as `0x${string}`, onUpdate: setDelegateUpdate },
        child,
        "{}",
        BigInt(spendCap || "0"),
        deadlineIso
      );
      setDelegateUpdate(result);
      toast.push(result.phase === "FAILED" ? "error" : "success", result.phase === "FAILED" ? `Delegate failed: ${result.error}` : "Delegation created. Check the receipt for its delegation_id.");
    } finally {
      setDelegating(false);
    }
  };

  return (
    <div>
      <h1>Agent Atlas</h1>
      <p className="field-help">Capabilities, verifiable histories, delegation links, bounded reputation.</p>

      <ConfigGate>
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="panel">
            <h2>Register / update my passport</h2>
            <div className="field">
              <label htmlFor="caps">Capabilities (JSON)</label>
              <textarea id="caps" value={capabilities} onChange={(e) => setCapabilities(e.target.value)} />
            </div>
            <button className="btn btn-primary" disabled={!wallet || registering} onClick={handleRegister}>
              {registering ? "Submitting…" : "Register agent"}
            </button>
            <div style={{ marginTop: 10 }}>
              <TxProgress update={registerUpdate} />
            </div>

            <h2 style={{ marginTop: 20 }}>Create a delegation</h2>
            <div className="field">
              <label htmlFor="child">Child agent address</label>
              <input id="child" type="text" placeholder="0x..." value={child} onChange={(e) => setChild(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cap">Spend cap (atto)</label>
              <input id="cap" type="text" inputMode="numeric" value={spendCap} onChange={(e) => setSpendCap(e.target.value.replace(/[^0-9]/g, ""))} />
            </div>
            <div className="field">
              <label htmlFor="exp">Expires at</label>
              <input id="exp" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <button className="btn btn-ghost" disabled={!wallet || delegating} onClick={handleDelegate}>
              {delegating ? "Submitting…" : "Create delegation"}
            </button>
            <div style={{ marginTop: 10 }}>
              <TxProgress update={delegateUpdate} />
            </div>
          </div>

          <div>
            <div className="panel">
              <h2>Look up a passport</h2>
              <div className="field">
                <label htmlFor="lookup">Agent address</label>
                <input id="lookup" type="text" placeholder="0x..." value={lookupAddr} onChange={(e) => setLookupAddr(e.target.value)} />
              </div>
              {lookupAddr && passportState.status === "loading" && <SkeletonLines count={3} />}
              {lookupAddr && passportState.status === "error" && <p role="alert">{passportState.error}</p>}
            </div>
            {lookupAddr && passportState.status === "ready" && (
              <div style={{ marginTop: 12 }}>
                <AgentPassportCard passport={passportState.data} />
              </div>
            )}

            <div className="panel" style={{ marginTop: 12 }}>
              <h2>Look up a delegation</h2>
              <IdPicker kind="delegations" label="Delegation ID" placeholder="D-1" value={delegationId} onChange={setDelegationId} />
              {delegationId && delegationState.status === "loading" && <SkeletonLines count={3} />}
              {delegationId && delegationState.status === "error" && <p role="alert">{delegationState.error}</p>}
              {delegationId && delegationState.status === "ready" && (
                <>
                  <DelegationGraph delegation={delegationState.data} />
                  <button className="btn btn-ghost btn-sm" onClick={() => addBookmark("delegations", delegationId)}>
                    Bookmark
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </ConfigGate>
    </div>
  );
}
