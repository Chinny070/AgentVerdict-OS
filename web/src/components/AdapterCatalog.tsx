interface AdapterManifest {
  moduleId: string;
  version: string;
  status: "IMPLEMENTED" | "EXPERIMENTAL";
  rubricDimensions: string[];
  evidenceTypes: string[];
  equivalence: string;
  failureHandling: string;
}

/**
 * Transcribed from contracts/agentverdict.py's `_evaluate_api_delivery`
 * and `_evaluate_agent_task` instruction strings and
 * docs/EQUIVALENCE_MATRIX.md — these are the only two real, registered
 * evaluation modules in this build. Feature 22 (Universal Evaluation
 * Adapter SDK) is DEFERRED: there is no typed adapter manifest format or
 * third-party registration flow yet, so this catalog is read-only
 * documentation of what exists, not a live "install an adapter" UI.
 */
const ADAPTERS: AdapterManifest[] = [
  {
    moduleId: "api-delivery",
    version: "1.0.0",
    status: "IMPLEMENTED",
    rubricDimensions: [
      "endpoint coverage",
      "status/schema behavior",
      "authentication behavior (if publicly testable)",
      "error handling",
      "documented functionality",
      "version consistency",
      "evidence freshness",
      "test reproducibility",
      "security constraints",
    ],
    evidenceTypes: ["public GitHub repo URL", "live API endpoint URL", "public test output URL"],
    equivalence: "Custom leader/validator via gl.vm.run_nondet: structured decision + per-criterion (id,status) set must match; free-form reason text is never compared.",
    failureHandling:
      "Unreachable/private evidence source -> criterion marked INSUFFICIENT_EVIDENCE, never guessed. Self-reported screenshots are explicitly not treated as independently verified passing tests.",
  },
  {
    moduleId: "agent-task",
    version: "1.0.0",
    status: "IMPLEMENTED",
    rubricDimensions: [
      "task coverage",
      "output relevance",
      "correctness",
      "constraint adherence",
      "completeness",
      "evidence reliability",
      "timeliness",
      "authorized delegation",
      "attribution",
    ],
    evidenceTypes: ["reports", "source repositories", "public artifact URLs", "structured execution traces"],
    equivalence: "Same custom leader/validator strategy as api-delivery; identical structured-field comparison.",
    failureHandling:
      "Multi-delegate evidence with an unattributable failure -> INSUFFICIENT_EVIDENCE with HIGH uncertainty, never a fabricated per-agent blame assignment (see tests/direct/test_agent_task.py).",
  },
];

export function AdapterCatalog() {
  return (
    <div className="grid grid-2">
      {ADAPTERS.map((a) => (
        <article key={a.moduleId} className="panel spectral-edge">
          <div className="topbar" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>
              {a.moduleId}@{a.version}
            </h3>
            <span className="badge badge-confirmed">{a.status}</span>
          </div>
          <h4>Rubric dimensions</h4>
          <ul>
            {a.rubricDimensions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <h4>Accepted evidence</h4>
          <p>{a.evidenceTypes.join(" · ")}</p>
          <h4>Validator equivalence</h4>
          <p>{a.equivalence}</p>
          <h4>Failure handling</h4>
          <p>{a.failureHandling}</p>
        </article>
      ))}
    </div>
  );
}
