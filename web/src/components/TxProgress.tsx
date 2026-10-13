import type { TxPhase, TxUpdate } from "../chain/transactions";
import { TX_PHASE_LABEL } from "../chain/transactions";
import { CopyHash } from "./CopyHash";

const ORDER: TxPhase[] = ["WALLET_CONFIRM", "SUBMITTED", "PROCESSING", "ACCEPTED", "FINALIZED"];

/**
 * Renders the real, distinct transaction/finality phases for a single
 * write. Never shows a phase the SDK did not actually report (see
 * chain/transactions.ts::runWrite) — a FAILED phase always carries the real
 * error message, and ACCEPTED is shown distinctly from FINALIZED per the
 * brief's "distinct transaction/finality states" requirement.
 */
export function TxProgress({ update }: { update: TxUpdate | null }) {
  if (!update || update.phase === "IDLE") return null;

  if (update.phase === "FAILED") {
    return (
      <div className="panel" role="alert" style={{ borderColor: "var(--coral)" }}>
        <span className="badge badge-failed">
          <span className="badge-dot" aria-hidden="true" />
          Failed
        </span>
        <p style={{ marginTop: 8 }}>{update.error}</p>
        {update.hash && <CopyHash value={update.hash} label="tx" />}
      </div>
    );
  }

  const currentIndex = ORDER.indexOf(update.phase);

  return (
    <div className="panel" aria-live="polite">
      <ol style={{ display: "flex", flexWrap: "wrap", gap: 10, listStyle: "none", margin: 0, padding: 0 }}>
        {ORDER.map((phase, i) => {
          const reached = currentIndex >= i;
          return (
            <li key={phase}>
              <span
                className="badge"
                style={{
                  color: reached ? "var(--cyan)" : "var(--text-muted)",
                  opacity: reached ? 1 : 0.5,
                }}
              >
                <span className="badge-dot" aria-hidden="true" />
                {TX_PHASE_LABEL[phase]}
              </span>
            </li>
          );
        })}
      </ol>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {update.hash && <CopyHash value={update.hash} label="tx hash" />}
        {update.consensusStatus && <span className="field-help">consensus: {update.consensusStatus}</span>}
        {update.executionResult && <span className="field-help">execution: {update.executionResult}</span>}
      </div>
    </div>
  );
}
