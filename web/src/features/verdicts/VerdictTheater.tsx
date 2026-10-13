import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ConfigGate } from "../../components/ConfigGate";
import { IdPicker } from "../../components/IdPicker";
import { VerdictCard } from "../../components/VerdictCard";
import { SkeletonLines } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, type VerdictView } from "../../chain/contract";

export default function VerdictTheater() {
  const [agreementId, setAgreementId] = useState("");
  const fetcher = useCallback((a: `0x${string}`) => reads.getVerdict(a, agreementId), [agreementId]);
  const state = useContractRead<VerdictView>(agreementId ? fetcher : null, [agreementId]);

  return (
    <div>
      <h1>Verdict Theater</h1>
      <p className="field-help">
        Structured findings, citations, uncertainty, and transaction state for a real GenVM evaluation attempt.
      </p>

      <ConfigGate>
        <IdPicker kind="agreements" label="Agreement ID" placeholder="A-1" value={agreementId} onChange={setAgreementId} />

        {agreementId && state.status === "loading" && <SkeletonLines count={6} />}
        {agreementId && state.status === "error" && (
          <EmptyState
            icon="◇"
            title="No verdict recorded yet"
            description={state.error}
            action={
              <Link to={`/missions?id=${encodeURIComponent(agreementId)}`} className="btn btn-primary btn-sm">
                Request an evaluation in Mission Control
              </Link>
            }
          />
        )}
        {agreementId && state.status === "ready" && <VerdictCard verdict={state.data} />}
      </ConfigGate>
    </div>
  );
}
