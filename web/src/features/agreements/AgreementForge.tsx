import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConfigGate } from "../../components/ConfigGate";
import { IdPicker } from "../../components/IdPicker";
import { AgreementEditor, serializeRubric, validateAgreementDraft, type AgreementDraft } from "../../components/AgreementEditor";
import { StatusBadge } from "../../components/StatusBadge";
import { TxProgress } from "../../components/TxProgress";
import { SkeletonLines } from "../../components/Skeleton";
import { useContractAddress } from "../../state/ContractAddressContext";
import { useWallet } from "../../state/WalletContext";
import { useToast } from "../../state/ToastContext";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, writes, type AgreementView } from "../../chain/contract";
import { addBookmark } from "../../state/localRegistry";
import type { TxUpdate } from "../../chain/transactions";

const EMPTY_DRAFT: AgreementDraft = {
  counterparty: "",
  policyId: "",
  moduleId: "api-delivery",
  amountAtto: "0",
  deadline: "",
  rubric: [{ id: "criterion-1", description: "" }],
};

function LifecycleActions({
  agreement,
  address,
  onDone,
}: {
  agreement: AgreementView;
  address: `0x${string}`;
  onDone: () => void;
}) {
  const { wallet } = useWallet();
  const toast = useToast();
  const [update, setUpdate] = useState<TxUpdate | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (label: string, fn: () => Promise<TxUpdate>) => {
    if (!wallet) {
      toast.push("error", "Connect a wallet first.");
      return;
    }
    setBusy(true);
    setUpdate(null);
    try {
      const result = await fn();
      setUpdate(result);
      if (result.phase === "FAILED") {
        toast.push("error", `${label} failed: ${result.error}`);
      } else {
        toast.push("success", `${label} confirmed (${result.phase}).`);
        onDone();
      }
    } finally {
      setBusy(false);
    }
  };

  const opts = wallet ? { wallet, address, onUpdate: setUpdate } : null;

  const actions: Array<{ label: string; show: boolean; fn: () => Promise<TxUpdate> }> = opts
    ? [
        { label: "Propose", show: agreement.state === "DRAFT", fn: () => writes.proposeAgreement(opts, agreement.agreement_id) },
        { label: "Accept", show: agreement.state === "PROPOSED", fn: () => writes.acceptAgreement(opts, agreement.agreement_id) },
        { label: "Decline", show: agreement.state === "PROPOSED", fn: () => writes.declineAgreement(opts, agreement.agreement_id) },
        { label: "Expire (past deadline)", show: agreement.state === "PROPOSED", fn: () => writes.expireAgreement(opts, agreement.agreement_id) },
        { label: "Activate", show: agreement.state === "ACCEPTED", fn: () => writes.activateAgreement(opts, agreement.agreement_id) },
        { label: "Open evidence", show: agreement.state === "ACTIVE", fn: () => writes.openEvidence(opts, agreement.agreement_id) },
      ]
    : [];

  return (
    <div className="panel">
      <h3>Lifecycle actions</h3>
      <p className="field-help">
        The chain enforces who may call each action (creator vs. counterparty) — a button here does not
        guarantee success; a rejected call surfaces its real error below.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!opts && <span className="field-help">Connect a wallet to act on this agreement.</span>}
        {actions
          .filter((a) => a.show)
          .map((a) => (
            <button key={a.label} className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(a.label, a.fn)}>
              {a.label}
            </button>
          ))}
        {opts && actions.filter((a) => a.show).length === 0 && (
          <span className="field-help">No lifecycle action is available from state {agreement.state}.</span>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <TxProgress update={update} />
      </div>
    </div>
  );
}

export default function AgreementForge() {
  const [params, setParams] = useSearchParams();
  const [agreementId, setAgreementId] = useState(params.get("id") ?? "");
  const [draft, setDraft] = useState<AgreementDraft>(EMPTY_DRAFT);
  const [createUpdate, setCreateUpdate] = useState<TxUpdate | null>(null);
  const [creating, setCreating] = useState(false);
  const { address } = useContractAddress();
  const { wallet } = useWallet();
  const toast = useToast();

  const fetcher = useCallback((addr: `0x${string}`) => reads.getAgreement(addr, agreementId), [agreementId]);
  const canFetch = agreementId.trim().length > 0;
  const agreementState = useContractRead<AgreementView>(canFetch ? fetcher : null, [agreementId]);

  const rubricJson = useMemo(() => serializeRubric(draft.rubric), [draft.rubric]);

  const handleOpenId = (id: string) => {
    setAgreementId(id);
    setParams(id ? { id } : {});
  };

  const handleCreate = async () => {
    if (!wallet || !address) {
      toast.push("error", "Connect a wallet and configure a contract address first.");
      return;
    }
    const validationError = validateAgreementDraft(draft);
    if (validationError) {
      toast.push("error", validationError);
      return;
    }
    setCreating(true);
    setCreateUpdate(null);
    try {
      const deadlineIso = draft.deadline ? new Date(draft.deadline).toISOString() : "";
      const result = await writes.createAgreement(
        { wallet, address: address as `0x${string}`, onUpdate: setCreateUpdate },
        draft.counterparty,
        draft.policyId,
        draft.moduleId,
        BigInt(draft.amountAtto || "0"),
        deadlineIso,
        rubricJson
      );
      setCreateUpdate(result);
      if (result.phase !== "FAILED") {
        if (typeof result.returnValue === "string" && result.returnValue.startsWith("A-")) {
          setAgreementId(result.returnValue);
          setParams({ id: result.returnValue });
          toast.push("success", `Agreement ${result.returnValue} finalized. Loading its on-chain state.`);
        } else {
          toast.push("success", "Agreement finalized. Check the transaction receipt for its agreement_id.");
        }
      } else {
        toast.push("error", `Create failed: ${result.error}`);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1>Agreement Forge</h1>
      <p className="field-help">Create, preview, freeze, and accept agreements bound to a frozen policy + module version.</p>

      <ConfigGate>
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div>
            <h2>Create a new agreement</h2>
            <AgreementEditor draft={draft} onChange={setDraft} />
            <button className="btn btn-primary" disabled={creating || !wallet} onClick={handleCreate}>
              {creating ? "Submitting…" : "Create agreement"}
            </button>
            {!wallet && <p className="field-help">Connect a wallet to submit.</p>}
            <div style={{ marginTop: 10 }}>
              <TxProgress update={createUpdate} />
            </div>
          </div>

          <div>
            <h2>Inspect an existing agreement</h2>
            <IdPicker kind="agreements" label="Agreement ID" placeholder="A-1" value={agreementId} onChange={handleOpenId} />
            {canFetch && agreementState.status === "loading" && <SkeletonLines count={5} />}
            {canFetch && agreementState.status === "error" && (
              <div className="panel" role="alert">
                <p>{agreementState.error}</p>
              </div>
            )}
            {canFetch && agreementState.status === "ready" && (
              <>
                <div className="panel spectral-edge">
                  <div className="topbar" style={{ marginBottom: 8 }}>
                    <h3 style={{ margin: 0 }}>{agreementState.data.agreement_id}</h3>
                    <StatusBadge state={agreementState.data.state} />
                  </div>
                  <dl className="grid grid-2">
                    <div>
                      <dt className="field-help">Creator</dt>
                      <dd className="mono">{agreementState.data.creator}</dd>
                    </div>
                    <div>
                      <dt className="field-help">Counterparty</dt>
                      <dd className="mono">{agreementState.data.counterparty}</dd>
                    </div>
                    <div>
                      <dt className="field-help">Module</dt>
                      <dd>
                        {agreementState.data.module_id}@{agreementState.data.module_version}
                      </dd>
                    </div>
                    <div>
                      <dt className="field-help">Amount (atto)</dt>
                      <dd>{agreementState.data.amount_atto}</dd>
                    </div>
                    <div>
                      <dt className="field-help">Deadline</dt>
                      <dd>{agreementState.data.deadline}</dd>
                    </div>
                    <div>
                      <dt className="field-help">Attempt</dt>
                      <dd>{agreementState.data.attempt_no}</dd>
                    </div>
                  </dl>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => addBookmark("agreements", agreementState.data.agreement_id)}
                  >
                    Bookmark this agreement
                  </button>
                </div>
                <div style={{ marginTop: 12 }}>
                  <LifecycleActions
                    agreement={agreementState.data}
                    address={address as `0x${string}`}
                    onDone={agreementState.refresh}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </ConfigGate>
    </div>
  );
}
