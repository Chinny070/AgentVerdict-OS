/**
 * Maps every contract-defined lifecycle state (contracts/agentverdict.py
 * ST_* constants) plus verdict/challenge/settlement sub-states to a
 * color+text badge. Never color alone (WCAG 2.2 AA): the text label is
 * always rendered, color is a reinforcing signal only.
 */
const STATE_CLASS: Record<string, string> = {
  DRAFT: "badge-draft",
  PROPOSED: "badge-pending",
  DECLINED: "badge-failed",
  EXPIRED: "badge-failed",
  ACCEPTED: "badge-active",
  ACTIVE: "badge-active",
  EVIDENCE_OPEN: "badge-active",
  CHALLENGE_WINDOW: "badge-pending",
  CHALLENGED: "badge-challenged",
  REEVALUATING: "badge-pending",
  REMEDIATION_REQUESTED: "badge-pending",
  FINALIZED: "badge-confirmed",
  SETTLED: "badge-confirmed",
  TERMINATED: "badge-failed",
  CANCELLED_BY_RULE: "badge-failed",
  EVALUATION_ERROR: "badge-failed",
  PASS: "badge-confirmed",
  PARTIAL: "badge-pending",
  FAIL: "badge-failed",
  INSUFFICIENT_EVIDENCE: "badge-draft",
  ERROR: "badge-failed",
  OPEN: "badge-challenged",
  UPHELD: "badge-escalated",
  REJECTED: "badge-confirmed",
  // Stage 6: permissionless timeout recovery (resolve_challenge_by_timeout).
  // Tagged distinctly from a normal admin REJECTED so it's unambiguous in
  // the UI that no discretionary admin judgment was applied -- see
  // docs/STAGE_6_MIGRATION_NOTE.md.
  TIMEOUT_REJECTED: "badge-escalated",
  AUTHORIZED: "badge-pending",
  EXECUTED: "badge-confirmed",
  PROVISIONAL: "badge-pending",
  FINAL: "badge-confirmed",
};

export function StatusBadge({ state, className = "" }: { state: string; className?: string }) {
  const cls = STATE_CLASS[state] ?? "badge-draft";
  return (
    <span className={`badge ${cls} ${className}`}>
      <span className="badge-dot" aria-hidden="true" />
      {state.replace(/_/g, " ")}
    </span>
  );
}

export function ExperimentalBadge({ label = "Experimental" }: { label?: string }) {
  return <span className="badge badge-experimental">{label}</span>;
}
