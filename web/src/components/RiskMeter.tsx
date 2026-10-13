const UNCERTAINTY_WEIGHT: Record<string, number> = { LOW: 0.2, MEDIUM: 0.5, HIGH: 0.8, UNKNOWN: 0.65 };
const UNCERTAINTY_COLOR: Record<string, string> = {
  LOW: "var(--mint)",
  MEDIUM: "var(--tangerine)",
  HIGH: "var(--coral)",
  UNKNOWN: "var(--opaline)",
};

/**
 * Feature 14 (Dynamic Risk Classification) is DEFERRED per
 * docs/FEATURE_IMPLEMENTATION_LEDGER.md — there is no dedicated risk-tier
 * classifier on-chain. This component is an honest client-side derivation
 * from the real `Verdict.uncertainty` field only (never invented), and is
 * labeled Experimental rather than presented as a protocol guarantee.
 */
export function RiskMeter({ uncertainty }: { uncertainty: string }) {
  const weight = UNCERTAINTY_WEIGHT[uncertainty] ?? 0.65;
  const color = UNCERTAINTY_COLOR[uncertainty] ?? "var(--opaline)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="field-help">Uncertainty-derived risk (client-side, experimental)</span>
        <span className="field-help">{uncertainty}</span>
      </div>
      <div
        className="risk-meter-track"
        role="img"
        aria-label={`Uncertainty ${uncertainty}, approximate risk ${Math.round(weight * 100)} percent`}
      >
        <div className="risk-meter-fill" style={{ width: `${weight * 100}%`, background: color }} />
      </div>
    </div>
  );
}
