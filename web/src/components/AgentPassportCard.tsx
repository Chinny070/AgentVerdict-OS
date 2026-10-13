import type { AgentPassportView } from "../chain/contract";
import { CopyHash } from "./CopyHash";

/** Feature 16, Agent Identity and Capability Passport. */
export function AgentPassportCard({ passport }: { passport: AgentPassportView }) {
  let capabilities: string[] = [];
  try {
    const parsed = JSON.parse(passport.capabilities_json);
    capabilities = Array.isArray(parsed) ? parsed : Object.keys(parsed ?? {});
  } catch {
    capabilities = [];
  }

  return (
    <div className="panel">
      <div className="topbar" style={{ marginBottom: 8 }}>
        <CopyHash value={passport.owner} label="agent" />
        {passport.revoked && <span className="badge badge-failed">Revoked</span>}
      </div>
      <dl className="grid grid-3">
        <div>
          <dt className="field-help">Completed</dt>
          <dd className="metric-value" style={{ fontSize: "1.4rem" }}>
            {passport.completed_count}
          </dd>
        </div>
        <div>
          <dt className="field-help">Disputed</dt>
          <dd className="metric-value" style={{ fontSize: "1.4rem" }}>
            {passport.disputed_count}
          </dd>
        </div>
        <div>
          <dt className="field-help">Reputation score</dt>
          <dd className="metric-value" style={{ fontSize: "1.4rem" }}>
            {passport.reputation_score}
          </dd>
        </div>
      </dl>
      <p className="field-help">
        This score is local to this contract instance only (feature 27, Cross-Application Reputation, is
        DEFERRED — it is not a portable cross-app reference).
      </p>
      {capabilities.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {capabilities.map((c) => (
            <span key={c} className="mono-chip">
              {c}
            </span>
          ))}
        </div>
      )}
      <p className="field-help">Registered {passport.registered_at}</p>
    </div>
  );
}
