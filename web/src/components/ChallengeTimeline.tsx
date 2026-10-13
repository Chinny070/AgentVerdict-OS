import type { ChallengeView, VerdictView } from "../chain/contract";
import { StatusBadge } from "./StatusBadge";

interface ChallengeTimelineProps {
  verdict: VerdictView | null;
  challenge: ChallengeView | null;
}

/** Grounds, deadlines, challenge packets, decision history, finality (spec section 2). */
export function ChallengeTimeline({ verdict, challenge }: ChallengeTimelineProps) {
  const now = Date.now();
  const deadlinePassed = verdict ? now > Date.parse(verdict.challenge_deadline) : false;

  // Stage 6: resolution_deadline is empty on challenges read from the
  // currently-deployed StudioNet instance (predates this field) -- guard
  // against treating "" as a passed deadline.
  const hasResolutionDeadline = Boolean(challenge?.resolution_deadline);
  const resolutionDeadlinePassed =
    challenge && hasResolutionDeadline ? now > Date.parse(challenge.resolution_deadline) : false;
  const timeoutRecoveryEligible = challenge?.state === "OPEN" && resolutionDeadlinePassed;

  const steps = [
    { label: "Provisional verdict issued", done: Boolean(verdict) },
    { label: "Challenge window open", done: Boolean(verdict) && !deadlinePassed },
    { label: "Challenge filed", done: Boolean(challenge) },
    { label: "Challenge resolved", done: challenge ? challenge.state !== "OPEN" : false },
    { label: "Finalized", done: verdict?.state === "FINAL" },
  ];

  return (
    <div className="panel">
      <h3>Challenge timeline</h3>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s) => (
          <li key={s.label} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              aria-hidden="true"
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                flexShrink: 0,
                background: s.done ? "var(--mint)" : "transparent",
                border: `2px solid ${s.done ? "var(--mint)" : "var(--border-spectral)"}`,
              }}
            />
            <span style={{ color: s.done ? "var(--text-elevated)" : "var(--text-muted)" }}>{s.label}</span>
          </li>
        ))}
      </ol>
      {verdict && (
        <p className="field-help" style={{ marginTop: 10 }}>
          Challenge deadline: <time dateTime={verdict.challenge_deadline}>{verdict.challenge_deadline}</time>{" "}
          {deadlinePassed ? "(closed)" : "(open)"}
        </p>
      )}
      {challenge && (
        <div style={{ marginTop: 10 }}>
          <StatusBadge state={challenge.state} />
          <p style={{ marginTop: 6 }}>{challenge.grounds}</p>
          {challenge.resolution && <p className="field-help">Resolution: {challenge.resolution}</p>}
          {challenge.state === "OPEN" && hasResolutionDeadline && (
            <p className="field-help" style={{ marginTop: 6 }}>
              Admin resolution deadline:{" "}
              <time dateTime={challenge.resolution_deadline}>{challenge.resolution_deadline}</time>{" "}
              {resolutionDeadlinePassed ? (
                <span style={{ color: "var(--tangerine)" }}>
                  (passed — eligible for permissionless timeout recovery)
                </span>
              ) : (
                "(admin may still resolve_challenge)"
              )}
            </p>
          )}
          {challenge.state === "OPEN" && !hasResolutionDeadline && (
            <p className="field-help" style={{ marginTop: 6 }}>
              No admin resolution deadline recorded on this challenge — it predates the
              Stage 6 timeout-recovery fix (see docs/STAGE_6_MIGRATION_NOTE.md). Only the
              admin's own resolve_challenge can unstick this agreement if challenged.
            </p>
          )}
          {timeoutRecoveryEligible && (
            <p className="field-help" style={{ marginTop: 6, color: "var(--mint)" }}>
              Timeout recovery is available: any wallet may now call
              resolve_challenge_by_timeout to deterministically uphold the original
              verdict and reopen the challenge window.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
