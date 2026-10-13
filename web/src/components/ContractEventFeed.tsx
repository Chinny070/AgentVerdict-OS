import { useEffect, useRef, useState } from "react";
import type { ProtocolStatsView } from "../chain/contract";

interface ContractEventFeedProps {
  stats: ProtocolStatsView | null;
  onRefresh: () => void;
}

interface ActivityLine {
  id: number;
  text: string;
  at: string;
}

/**
 * Feature 29/33 (Event-Driven Automation / Webhook-Event Subscription) are
 * DEFERRED on-chain — this contract emits no `gl.chain.Event`s. This feed
 * is therefore an honest client-side poller that diffs
 * `get_protocol_stats()` counters on manual refresh, NOT a push
 * subscription and NOT a server-side webhook. It never fabricates an
 * activity line it did not derive from a real counter change.
 */
export function ContractEventFeed({ stats, onRefresh }: ContractEventFeedProps) {
  const previous = useRef<ProtocolStatsView | null>(null);
  const [lines, setLines] = useState<ActivityLine[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    if (!stats) return;
    const prev = previous.current;
    if (prev) {
      const deltas: Array<[keyof ProtocolStatsView, string]> = [
        ["agreement_count", "agreement"],
        ["evidence_count", "evidence packet"],
        ["delegation_count", "delegation"],
        ["challenge_count", "challenge"],
        ["settlement_count", "settlement"],
        ["reputation_event_count", "reputation event"],
      ];
      const newLines: ActivityLine[] = [];
      for (const [key, label] of deltas) {
        const diff = (stats[key] as number) - (prev[key] as number);
        if (diff > 0) {
          newLines.push({
            id: nextId.current++,
            text: `+${diff} ${label}${diff > 1 ? "s" : ""} since last refresh`,
            at: new Date().toLocaleTimeString(),
          });
        }
      }
      if (newLines.length > 0) setLines((l) => [...newLines, ...l].slice(0, 20));
    }
    previous.current = stats;
  }, [stats]);

  return (
    <div className="panel">
      <div className="topbar" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Contract activity (client-driven watcher)</h3>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh}>
          Refresh now
        </button>
      </div>
      <p className="field-help">
        Polls <code>get_protocol_stats()</code> on demand and reports real counter deltas. This is a manual,
        client-run watcher — not an always-on background subscription and not a webhook.
      </p>
      {lines.length === 0 ? (
        <p className="field-help">No counter changes observed yet. Refresh after a transaction finalizes.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {lines.map((l) => (
            <li key={l.id} className="field-help" style={{ padding: "4px 0" }}>
              [{l.at}] {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
