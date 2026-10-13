import { useCallback, useState } from "react";
import { ConfigGate } from "../../components/ConfigGate";
import { IdPicker } from "../../components/IdPicker";
import { EvidenceGraph } from "../../components/EvidenceGraph";
import { SkeletonLines } from "../../components/Skeleton";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, type EvidenceMetadataView } from "../../chain/contract";

function ageLabel(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return "unknown age";
  const hours = ms / 3_600_000;
  if (hours < 1) return "under 1 hour old";
  if (hours < 48) return `${Math.round(hours)}h old`;
  return `${Math.round(hours / 24)}d old`;
}

export default function EvidenceObservatory() {
  const [agreementId, setAgreementId] = useState("");
  const fetcher = useCallback((a: `0x${string}`) => reads.getEvidenceMetadata(a, agreementId), [agreementId]);
  const state = useContractRead<EvidenceMetadataView>(agreementId ? fetcher : null, [agreementId]);

  return (
    <div>
      <h1>Evidence Observatory</h1>
      <p className="field-help">
        Source graph, freshness, and visibility classification for one agreement's submitted evidence (feature
        13, Evidence Freshness Monitor — age computed client-side from the real on-chain
        <code> submitted_at</code> timestamp, nothing fabricated).
      </p>

      <ConfigGate>
        <IdPicker kind="agreements" label="Agreement ID" placeholder="A-1" value={agreementId} onChange={setAgreementId} />

        {agreementId && state.status === "loading" && <SkeletonLines count={4} />}
        {agreementId && state.status === "error" && <p role="alert">{state.error}</p>}
        {agreementId && state.status === "ready" && (
          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div className="panel">
              <h3>Constellation</h3>
              <EvidenceGraph agreementId={agreementId} evidence={state.data.evidence} />
            </div>
            <div className="panel">
              <h3>Provenance table</h3>
              {state.data.evidence.length === 0 ? (
                <p className="field-help">No evidence submitted for this agreement yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Criterion</th>
                      <th scope="col">Submitter</th>
                      <th scope="col">Freshness</th>
                      <th scope="col">Visibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.evidence.map((e) => (
                      <tr key={e.evidence_id}>
                        <td className="mono">{e.evidence_id}</td>
                        <td>{e.criterion_id}</td>
                        <td className="mono">{e.submitter.slice(0, 10)}…</td>
                        <td>{ageLabel(e.submitted_at)}</td>
                        <td>{e.visibility}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="field-help" style={{ marginTop: 10 }}>
                Anti-prompt-injection firewall (feature 35): evidence content is only ever treated as data by
                the contract's LLM adjudication, wrapped in explicit BEGIN/END_DATA_NOT_INSTRUCTIONS markers —
                verified by tests/direct/test_evidence.py::test_prompt_injection_payload_is_inert. This
                observatory cannot itself re-fetch evidence bodies (that happens inside GenVM during
                evaluation, not in the browser).
              </p>
            </div>
          </div>
        )}
      </ConfigGate>
    </div>
  );
}
