import type { AgreementView, VerdictView } from "../chain/contract";
import { StatusBadge } from "./StatusBadge";

interface RecoveryPanelProps {
  agreement: AgreementView;
  verdict: VerdictView | null;
  onRequestRework: () => void;
  onAcknowledgeRecovery: () => void;
  onTerminate: () => void;
  busy?: boolean;
}

/** Feature 5, Autonomous Recovery Engine: rework / partial-completion / termination. */
export function RecoveryPanel({
  agreement,
  verdict,
  onRequestRework,
  onAcknowledgeRecovery,
  onTerminate,
  busy,
}: RecoveryPanelProps) {
  const canRework =
    (agreement.state === "CHALLENGE_WINDOW" || agreement.state === "FINALIZED") &&
    verdict?.remedy === "REWORK";
  const canAcknowledge = agreement.state === "REMEDIATION_REQUESTED";
  const canTerminate = verdict?.remedy === "ESCALATE" || agreement.attempt_no >= 3;

  return (
    <div className="panel">
      <h3>Recovery</h3>
      <p>
        Current state: <StatusBadge state={agreement.state} /> · last remedy:{" "}
        <strong>{agreement.last_remedy || "none yet"}</strong>
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button className="btn btn-ghost btn-sm" disabled={!canRework || busy} onClick={onRequestRework}>
          Request rework
        </button>
        <button className="btn btn-ghost btn-sm" disabled={!canAcknowledge || busy} onClick={onAcknowledgeRecovery}>
          Acknowledge recovery (reopen evidence)
        </button>
        <button className="btn btn-danger btn-sm" disabled={!canTerminate || busy} onClick={onTerminate}>
          Terminate agreement
        </button>
      </div>
      {!canRework && !canAcknowledge && !canTerminate && (
        <p className="field-help" style={{ marginTop: 8 }}>
          No recovery action is currently eligible for this agreement's state.
        </p>
      )}
    </div>
  );
}
