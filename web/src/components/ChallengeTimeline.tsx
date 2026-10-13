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
        </div>
      )}
    </div>
  );
}
