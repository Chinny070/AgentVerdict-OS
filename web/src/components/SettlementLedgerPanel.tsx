import type { SettlementView } from "../chain/contract";
import { StatusBadge } from "./StatusBadge";
import { CopyHash } from "./CopyHash";

/**
 * Honesty-critical component (task's explicit non-negotiable rule): this
 * contract has NO real asset custody. `authorize_settlement` only ever
 * creates a `SettlementInstruction` record (an authorization receipt), and
 * `record_settlement` only flips its status to EXECUTED — no payable
 * method exists anywhere in contracts/agentverdict.py, and
 * `settlement_native_transfer_enabled` defaults False with a hard-coded
 * honest error if ever flipped on (see contract's `record_settlement`).
 * This panel must never imply funds moved.
 */
export function SettlementLedgerPanel({ settlement }: { settlement: SettlementView | null }) {
  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Settlement</h3>
        <span className="badge badge-experimental">Authorization receipt only — no real asset custody</span>
      </div>
      <p className="field-help">
        This protocol build never moves real funds. "AUTHORIZED" and "EXECUTED" below describe the state of a
        settlement <em>record</em>, not a completed payment. Native GEN transfer is disabled by default and,
        per <code>docs/SECURITY_THREAT_MODEL.md</code>, has not been independently verified live even when enabled.
      </p>
      {settlement ? (
        <dl className="grid grid-2" style={{ marginTop: 10 }}>
          <div>
            <dt className="field-help">Status</dt>
            <dd>
              <StatusBadge state={settlement.status} />
            </dd>
          </div>
          <div>
            <dt className="field-help">Recipient</dt>
            <dd>
              <CopyHash value={settlement.recipient} />
            </dd>
          </div>
          <div>
            <dt className="field-help">Authorized amount (atto-GEN, receipt only)</dt>
            <dd className="mono">{settlement.amount_atto.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="field-help">Reason (verdict decision)</dt>
            <dd>{settlement.reason}</dd>
          </div>
          <div>
            <dt className="field-help">Authorized at</dt>
            <dd>{settlement.created_at}</dd>
          </div>
          <div>
            <dt className="field-help">Executed at</dt>
            <dd>{settlement.executed_at || "not yet executed"}</dd>
          </div>
        </dl>
      ) : (
        <p className="field-help" style={{ marginTop: 10 }}>
          No settlement has been authorized for this agreement yet.
        </p>
      )}
    </div>
  );
}
