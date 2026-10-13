import type { VerdictView } from "../chain/contract";
import { StatusBadge } from "./StatusBadge";
import { CriterionFinding } from "./CriterionFinding";
import { RiskMeter } from "./RiskMeter";
import { CopyHash } from "./CopyHash";

export function VerdictCard({ verdict }: { verdict: VerdictView }) {
  return (
    <div className="panel spectral-edge">
      <div className="topbar" style={{ marginBottom: "var(--space-3)" }}>
        <div>
          <h3 style={{ margin: 0 }}>{verdict.verdict_id}</h3>
          <span className="field-help">
            {verdict.module_id}@{verdict.module_version} · attempt #{verdict.attempt_no}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge state={verdict.decision} />
          <StatusBadge state={verdict.state} />
        </div>
      </div>

      <RiskMeter uncertainty={verdict.uncertainty} />

      <h4 style={{ marginTop: "var(--space-4)" }}>Criterion findings</h4>
      {verdict.criteria.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {verdict.criteria.map((f, i) => (
            <CriterionFinding key={`${f.id}-${i}`} finding={f} />
          ))}
        </ul>
      ) : (
        <p className="field-help">No structured criteria were recorded for this verdict.</p>
      )}

      {verdict.limitations.length > 0 && (
        <>
          <h4>Stated limitations</h4>
          <ul>
            {verdict.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "var(--space-4)" }}>
        <CopyHash value={verdict.policy_hash} label="policy hash" shorten={false} />
        <CopyHash value={verdict.evidence_root} label="evidence root" shorten={false} />
      </div>
      <p className="field-help" style={{ marginTop: 8 }}>
        Remedy: <strong>{verdict.remedy}</strong> · challenge deadline:{" "}
        <time dateTime={verdict.challenge_deadline}>{verdict.challenge_deadline}</time>
      </p>
    </div>
  );
}
