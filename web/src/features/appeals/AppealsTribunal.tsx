import { useCallback, useState } from "react";
import { ConfigGate } from "../../components/ConfigGate";
import { IdPicker } from "../../components/IdPicker";
import { ChallengeTimeline } from "../../components/ChallengeTimeline";
import { StatusBadge } from "../../components/StatusBadge";
import { TxProgress } from "../../components/TxProgress";
import { SkeletonLines } from "../../components/Skeleton";
import { useContractAddress } from "../../state/ContractAddressContext";
import { useWallet } from "../../state/WalletContext";
import { useToast } from "../../state/ToastContext";
import { useContractRead } from "../../hooks/useContractRead";
import { reads, writes, type AgreementView, type ChallengeView, type VerdictView } from "../../chain/contract";
import { addBookmark } from "../../state/localRegistry";
import type { TxUpdate } from "../../chain/transactions";

export default function AppealsTribunal() {
  const { address } = useContractAddress();
  const { wallet } = useWallet();
  const toast = useToast();

  const [agreementId, setAgreementId] = useState("");
  const agreementFetcher = useCallback((a: `0x${string}`) => reads.getAgreement(a, agreementId), [agreementId]);
  const agreementState = useContractRead<AgreementView>(agreementId ? agreementFetcher : null, [agreementId]);

  const verdictFetcher = useCallback((a: `0x${string}`) => reads.getVerdict(a, agreementId), [agreementId]);
  const verdictState = useContractRead<VerdictView>(agreementId ? verdictFetcher : null, [agreementId]);

  const [challengeId, setChallengeId] = useState("");
  const challengeFetcher = useCallback((a: `0x${string}`) => reads.getChallenge(a, challengeId), [challengeId]);
  const challengeState = useContractRead<ChallengeView>(challengeId ? challengeFetcher : null, [challengeId]);

  const [grounds, setGrounds] = useState("");
  const [challengeUpdate, setChallengeUpdate] = useState<TxUpdate | null>(null);
  const [challenging, setChallenging] = useState(false);

  const [finalizeUpdate, setFinalizeUpdate] = useState<TxUpdate | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const handleChallenge = async () => {
    if (!wallet || !address) return toast.push("error", "Connect a wallet and configure a contract address.");
    setChallenging(true);
    try {
      const result = await writes.challengeVerdict(
        { wallet, address: address as `0x${string}`, onUpdate: setChallengeUpdate },
        agreementId,
        grounds
      );
      setChallengeUpdate(result);
      if (result.phase === "FAILED") toast.push("error", `Challenge failed: ${result.error}`);
      else {
        toast.push("success", "Challenge filed. Check the receipt for the new challenge_id, then bookmark it above.");
        agreementState.refresh();
      }
    } finally {
      setChallenging(false);
    }
  };

  const handleFinalize = async () => {
    if (!wallet || !address) return toast.push("error", "Connect a wallet and configure a contract address.");
    setFinalizing(true);
    try {
      const result = await writes.finalizeVerdict(
        { wallet, address: address as `0x${string}`, onUpdate: setFinalizeUpdate },
        agreementId
      );
      setFinalizeUpdate(result);
      if (result.phase === "FAILED") toast.push("error", `Finalize failed: ${result.error}`);
      else {
        toast.push("success", "Verdict finalized.");
        agreementState.refresh();
        verdictState.refresh();
      }
    } finally {
      setFinalizing(false);
    }
  };

  const deadlinePassed = verdictState.status === "ready" ? Date.now() > Date.parse(verdictState.data.challenge_deadline) : false;
  const canChallenge = agreementState.status === "ready" && agreementState.data.state === "CHALLENGE_WINDOW" && !deadlinePassed;
  const canFinalize = agreementState.status === "ready" && agreementState.data.state === "CHALLENGE_WINDOW" && deadlinePassed;

  return (
    <div>
      <h1>Appeals Tribunal</h1>
      <p className="field-help">Grounds, deadlines, challenge packets, decision history, and finality.</p>

      <ConfigGate>
        <IdPicker kind="agreements" label="Agreement ID" placeholder="A-1" value={agreementId} onChange={setAgreementId} />

        {agreementId && agreementState.status === "loading" && <SkeletonLines count={4} />}
        {agreementId && agreementState.status === "ready" && (
          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div>
              <div className="panel topbar">
                <span>
                  Agreement state: <StatusBadge state={agreementState.data.state} />
                </span>
              </div>

              <div className="panel" style={{ marginTop: 12 }}>
                <h3>File a challenge</h3>
                {!canChallenge && (
                  <p className="field-help" style={{ color: "var(--tangerine)" }}>
                    Not eligible right now — requires state CHALLENGE_WINDOW with the deadline not yet passed.
                  </p>
                )}
                <div className="field">
                  <label htmlFor="grounds">Grounds</label>
                  <textarea id="grounds" value={grounds} onChange={(e) => setGrounds(e.target.value)} maxLength={2000} />
                </div>
                <button className="btn btn-primary" disabled={!wallet || !canChallenge || challenging} onClick={handleChallenge}>
                  {challenging ? "Submitting…" : "Challenge verdict"}
                </button>
                <div style={{ marginTop: 10 }}>
                  <TxProgress update={challengeUpdate} />
                </div>
              </div>

              <div className="panel" style={{ marginTop: 12 }}>
                <h3>Finalize</h3>
                <p className="field-help">Requires the challenge window to have closed with no open challenge.</p>
                <button className="btn btn-ghost" disabled={!wallet || !canFinalize || finalizing} onClick={handleFinalize}>
                  {finalizing ? "Submitting…" : "Finalize verdict"}
                </button>
                <div style={{ marginTop: 10 }}>
                  <TxProgress update={finalizeUpdate} />
                </div>
              </div>

              <div className="panel" style={{ marginTop: 12 }}>
                <h3>Look up a challenge</h3>
                <IdPicker kind="challenges" label="Challenge ID" placeholder="C-1" value={challengeId} onChange={setChallengeId} />
                {challengeId && challengeState.status === "ready" && (
                  <button className="btn btn-ghost btn-sm" onClick={() => addBookmark("challenges", challengeId)}>
                    Bookmark
                  </button>
                )}
                {challengeId && challengeState.status === "error" && <p role="alert">{challengeState.error}</p>}
              </div>
            </div>

            <ChallengeTimeline
              verdict={verdictState.status === "ready" ? verdictState.data : null}
              challenge={challengeState.status === "ready" ? challengeState.data : null}
            />
          </div>
        )}
      </ConfigGate>
    </div>
  );
}
