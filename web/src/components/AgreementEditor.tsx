import { useState } from "react";
import { RubricMatrix, type RubricCriterion } from "./RubricMatrix";

export interface AgreementDraft {
  counterparty: string;
  policyId: string;
  moduleId: string;
  amountAtto: string;
  deadline: string;
  rubric: RubricCriterion[];
}

interface AgreementEditorProps {
  draft: AgreementDraft;
  onChange: (draft: AgreementDraft) => void;
  frozen?: boolean;
}

const MODULE_OPTIONS = ["api-delivery", "agent-task"];

/**
 * Create / preview / freeze step of Agreement Forge. "Freeze" here means
 * what the contract actually enforces (feature 4, Constitutional Agreement
 * Engine): once `create_agreement` is submitted, `policy_hash` and
 * `module_version` are bound forever and never re-read live — this editor
 * simply stops being editable (`frozen`) once that transaction is sent, it
 * does not add its own separate freezing mechanism.
 */
export function AgreementEditor({ draft, onChange, frozen = false }: AgreementEditorProps) {
  const [showJson, setShowJson] = useState(false);
  const rubricJson = JSON.stringify(draft.rubric);

  const set = <K extends keyof AgreementDraft>(key: K, value: AgreementDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="panel">
      <h3>Agreement terms</h3>
      {frozen && (
        <p className="field-help" style={{ color: "var(--tangerine)" }}>
          This agreement has been created on-chain. Policy and module version are now frozen and cannot be
          edited here or on-chain.
        </p>
      )}
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="counterparty">Counterparty address</label>
          <input
            id="counterparty"
            type="text"
            placeholder="0x..."
            value={draft.counterparty}
            disabled={frozen}
            onChange={(e) => set("counterparty", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="policyId">Policy template ID</label>
          <input
            id="policyId"
            type="text"
            placeholder="e.g. default-v1"
            value={draft.policyId}
            disabled={frozen}
            onChange={(e) => set("policyId", e.target.value)}
          />
          <span className="field-help">Must already be registered via register_policy_template.</span>
        </div>
        <div className="field">
          <label htmlFor="moduleId">Evaluation module</label>
          <select id="moduleId" value={draft.moduleId} disabled={frozen} onChange={(e) => set("moduleId", e.target.value)}>
            {MODULE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="amount">Amount (atto-GEN, authorization unit only)</label>
          <input
            id="amount"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={draft.amountAtto}
            disabled={frozen}
            onChange={(e) => set("amountAtto", e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
        <div className="field">
          <label htmlFor="deadline">Deadline (ISO 8601, UTC)</label>
          <input
            id="deadline"
            type="datetime-local"
            value={draft.deadline}
            disabled={frozen}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </div>
      </div>

      <h4>Rubric (frozen on-chain as rubric_json once created)</h4>
      <RubricMatrix criteria={draft.rubric} editable={!frozen} onChange={(c) => set("rubric", c)} />

      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setShowJson((s) => !s)}>
        {showJson ? "Hide" : "Preview"} rubric_json
      </button>
      {showJson && (
        <pre className="mono-chip" style={{ display: "block", whiteSpace: "pre-wrap", marginTop: 8, padding: 10 }}>
          {rubricJson}
        </pre>
      )}
    </div>
  );
}
