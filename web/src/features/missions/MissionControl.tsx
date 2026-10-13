import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ConfigGate } from "../../components/ConfigGate";
import { IdPicker } from "../../components/IdPicker";
import { StatusBadge } from "../../components/StatusBadge";
import { TxProgress } from "../../components/TxProgress";
import { SkeletonLines } from "../../components/Skeleton";
import { useContractAddress } from "../../state/ContractAddressContext";
import { useWallet } from "../../state/WalletContext";
import { useToast } from "../../state/ToastContext";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, writes, type AgreementView, type EvidenceMetadataView } from "../../chain/contract";
import type { TxUpdate } from "../../chain/transactions";

export default function MissionControl() {
  const { address } = useContractAddress();
  const { wallet } = useWallet();
  const toast = useToast();

  const [agreementId, setAgreementId] = useState("");
  const agreementFetcher = useCallback((a: `0x${string}`) => reads.getAgreement(a, agreementId), [agreementId]);
  const agreementState = useContractRead<AgreementView>(agreementId ? agreementFetcher : null, [agreementId]);

  const evidenceFetcher = useCallback((a: `0x${string}`) => reads.getEvidenceMetadata(a, agreementId), [agreementId]);
  const evidenceState = useContractRead<EvidenceMetadataView>(agreementId ? evidenceFetcher : null, [agreementId]);

  const [url, setUrl] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [mimeType, setMimeType] = useState("text/plain");
  const [criterionId, setCriterionId] = useState("criterion-1");
  const [submitUpdate, setSubmitUpdate] = useState<TxUpdate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [evalUpdate, setEvalUpdate] = useState<TxUpdate | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const handleSubmitEvidence = async () => {
    if (!wallet || !address) return toast.push("error", "Connect a wallet and configure a contract address.");
    setSubmitting(true);
    try {
      const result = await writes.submitEvidence(
        { wallet, address: address as `0x${string}`, onUpdate: setSubmitUpdate },
        agreementId,
        url,
        contentHash,
        mimeType,
        criterionId
      );
      setSubmitUpdate(result);
      if (result.phase === "FAILED") toast.push("error", `Submit failed: ${result.error}`);
      else {
        toast.push("success", "Evidence submitted.");
        evidenceState.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestEvaluation = async () => {
    if (!wallet || !address) return toast.push("error", "Connect a wallet and configure a contract address.");
    setEvaluating(true);
    try {
      const result = await writes.requestEvaluation(
        { wallet, address: address as `0x${string}`, onUpdate: setEvalUpdate },
        agreementId
      );
      setEvalUpdate(result);
      if (result.phase === "FAILED") {
        toast.push("error", `Evaluation request failed: ${result.error}`);
      } else {
        toast.push(
          "success",
          "Evaluation requested. This triggers a REAL GenVM leader/validator LLM adjudication — it can take noticeably longer than a plain state-change write."
        );
        agreementState.refresh();
      }
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div>
      <h1>Mission Control</h1>
      <p className="field-help">Milestones, evidence packets, and requesting a real on-chain evaluation.</p>

      <ConfigGate>
        <IdPicker kind="agreements" label="Agreement ID" placeholder="A-1" value={agreementId} onChange={setAgreementId} />

        {agreementId && agreementState.status === "loading" && <SkeletonLines count={3} />}
        {agreementId && agreementState.status === "error" && <p role="alert">{agreementState.error}</p>}
        {agreementId && agreementState.status === "ready" && (
          <>
            <div className="panel topbar">
              <span>
                State: <StatusBadge state={agreementState.data.state} />
              </span>
              <span className="field-help">
                attempt #{agreementState.data.attempt_no} · last decision: {agreementState.data.last_decision || "none"}
              </span>
            </div>

            <div className="grid grid-2" style={{ marginTop: 16, alignItems: "start" }}>
              <div className="panel">
                <h3>Submit evidence</h3>
                {agreementState.data.state !== "EVIDENCE_OPEN" && (
                  <p className="field-help" style={{ color: "var(--tangerine)" }}>
                    Agreement is not in EVIDENCE_OPEN. Open evidence first from Agreement Forge.
                  </p>
                )}
                <div className="field">
                  <label htmlFor="url">Evidence URL (public http/https only)</label>
                  <input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="field">
                  <label htmlFor="hash">Content hash</label>
                  <input id="hash" type="text" value={contentHash} onChange={(e) => setContentHash(e.target.value)} placeholder="sha256:..." />
                </div>
                <div className="field">
                  <label htmlFor="mime">MIME type</label>
                  <input id="mime" type="text" value={mimeType} onChange={(e) => setMimeType(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="crit">Criterion ID</label>
                  <input id="crit" type="text" value={criterionId} onChange={(e) => setCriterionId(e.target.value)} />
                </div>
                <button className="btn btn-ghost" disabled={!wallet || submitting} onClick={handleSubmitEvidence}>
                  {submitting ? "Submitting…" : "Submit evidence"}
                </button>
                <div style={{ marginTop: 10 }}>
                  <TxProgress update={submitUpdate} />
                </div>
              </div>

              <div className="panel">
                <h3>Current evidence ({evidenceState.status === "ready" ? evidenceState.data.evidence.length : "…"})</h3>
                {evidenceState.status === "loading" && <SkeletonLines count={3} />}
                {evidenceState.status === "ready" && evidenceState.data.evidence.length === 0 && (
                  <p className="field-help">No evidence submitted yet.</p>
                )}
                {evidenceState.status === "ready" && evidenceState.data.evidence.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {evidenceState.data.evidence.map((e) => (
                      <li key={e.evidence_id} className="mono-chip" style={{ display: "block", marginBottom: 6 }}>
                        {e.evidence_id} · {e.criterion_id} · {e.mime_type}
                      </li>
                    ))}
                  </ul>
                )}
                <Link to={`/evidence?id=${encodeURIComponent(agreementId)}`} className="btn btn-ghost btn-sm">
                  Open in Evidence Observatory
                </Link>

                <h3 style={{ marginTop: 16 }}>Request real evaluation</h3>
                <p className="field-help">
                  Runs the bound module's leader/validator GenVM adjudication over all submitted evidence. No
                  "AI is thinking" animation is shown before this transaction is actually submitted.
                </p>
                <button className="btn btn-primary" disabled={!wallet || evaluating} onClick={handleRequestEvaluation}>
                  {evaluating ? "Requesting…" : "Request evaluation"}
                </button>
                <div style={{ marginTop: 10 }}>
                  <TxProgress update={evalUpdate} />
                </div>
              </div>
            </div>
          </>
        )}
      </ConfigGate>
    </div>
  );
}
