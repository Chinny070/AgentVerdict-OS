import { useState } from "react";
import { ExperimentalBadge } from "../../components/StatusBadge";

type Decision = "PASS" | "PARTIAL" | "FAIL" | "INSUFFICIENT_EVIDENCE";

/** Mirrors contracts/agentverdict.py::_derive_remedy exactly — the only
 * part of this screen that is "real" is that mapping; everything else is
 * illustrative, non-binding, and never calls the chain. */
function deriveRemedy(decision: Decision): string {
  switch (decision) {
    case "PASS":
      return "NONE";
    case "PARTIAL":
      return "PARTIAL_SETTLEMENT";
    case "FAIL":
      return "REWORK";
    case "INSUFFICIENT_EVIDENCE":
      return "RETRY";
    default:
      return "ESCALATE";
  }
}

/**
 * Feature 1, Counterfactual Verdict Simulator — P1, built only after all
 * P0 screens, per the build brief's priority order. Entirely client-side
 * and clearly labeled advisory: it NEVER promises a future validator
 * output, and never submits a transaction.
 */
export default function SimulationChamber() {
  const [decision, setDecision] = useState<Decision>("PARTIAL");
  const [amount, setAmount] = useState("1000");
  const remedy = deriveRemedy(decision);
  const amountNum = Number(amount) || 0;
  const authorizedAmount = decision === "PASS" ? amountNum : decision === "PARTIAL" ? Math.floor(amountNum / 2) : 0;

  return (
    <div>
      <div className="topbar">
        <h1 style={{ margin: 0 }}>Simulation Chamber</h1>
        <ExperimentalBadge label="Advisory · non-binding" />
      </div>
      <p className="field-help">
        This is a client-side illustration of the contract's deterministic remedy/settlement-amount rules
        (contracts/agentverdict.py `_derive_remedy` and `authorize_settlement`). It never calls the chain, never
        runs an LLM, and never predicts what a real GenVM leader/validator evaluation will decide — a real
        decision can only come from Mission Control's "Request evaluation."
      </p>

      <div className="panel" style={{ maxWidth: 480 }}>
        <div className="field">
          <label htmlFor="decision">Hypothetical decision</label>
          <select id="decision" value={decision} onChange={(e) => setDecision(e.target.value as Decision)}>
            <option value="PASS">PASS</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="FAIL">FAIL</option>
            <option value="INSUFFICIENT_EVIDENCE">INSUFFICIENT_EVIDENCE</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="amount">Agreement amount (atto-GEN, authorization unit only)</label>
          <input id="amount" type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} />
        </div>

        <h3>Resulting branch (deterministic, not predictive)</h3>
        <p>
          Remedy: <strong>{remedy}</strong>
        </p>
        <p>
          If finalized and settlement is authorized: <strong>{authorizedAmount.toLocaleString()}</strong>{" "}
          atto-GEN authorization receipt amount (never a real transfer — see Settlement Ledger).
        </p>
      </div>
    </div>
  );
}
