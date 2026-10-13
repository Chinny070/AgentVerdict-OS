import type { CriterionFindingView } from "../chain/contract";
import { StatusBadge } from "./StatusBadge";

/** Criterion -> evidence citations -> outcome (feature 15, Verdict Explanation Graph). */
export function CriterionFinding({ finding }: { finding: CriterionFindingView }) {
  return (
    <li className="panel" style={{ padding: "var(--space-3) var(--space-4)", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <strong className="mono">{finding.id}</strong>
        <StatusBadge state={finding.status} />
      </div>
      <p style={{ margin: "6px 0" }}>{finding.reason || "No explanation text returned by the evaluator."}</p>
      {finding.evidence_ids.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {finding.evidence_ids.map((id) => (
            <span key={id} className="mono-chip">
              {id}
            </span>
          ))}
        </div>
      ) : (
        <span className="field-help">No evidence cited for this criterion.</span>
      )}
    </li>
  );
}
