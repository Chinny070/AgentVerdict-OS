import type { DelegationView } from "../chain/contract";
import { StatusBadge } from "./StatusBadge";
import { CopyHash } from "./CopyHash";

/** Feature 18/19: scoped delegation, revocation, spend caps, lineage. */
export function DelegationGraph({ delegation }: { delegation: DelegationView }) {
  const expired = Date.now() > Date.parse(delegation.expires_at);
  const state = delegation.revoked ? "REVOKED" : expired ? "EXPIRED" : delegation.accepted ? "ACTIVE" : "DRAFT";

  return (
    <div className="panel">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <CopyHash value={delegation.parent} label="parent" />
        <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>
          →
        </span>
        <CopyHash value={delegation.child} label="child" />
        <StatusBadge state={state} />
      </div>
      <dl className="grid grid-2" style={{ marginTop: 10 }}>
        <div>
          <dt className="field-help">Spend cap (atto)</dt>
          <dd className="mono">{delegation.spend_cap_atto.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="field-help">Spent so far (atto)</dt>
          <dd className="mono">{delegation.spent_atto.toLocaleString()}</dd>
        </div>
      </dl>
      <p className="field-help">
        Spend-cap enforcement is PARTIAL per docs/FEATURE_IMPLEMENTATION_LEDGER.md (feature 19): the field is
        stored and read here, but no money-moving method in this build consumes it yet — the contract has no
        payable methods at all.
      </p>
      <p className="field-help">Expires {delegation.expires_at}</p>
    </div>
  );
}
