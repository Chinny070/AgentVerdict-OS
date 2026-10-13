import type { EvidenceRow } from "../chain/contract";

interface EvidenceGraphProps {
  agreementId: string;
  evidence: EvidenceRow[];
}

/**
 * Orbital/constellation evidence visualization (design spec section 3).
 * Purely a rendering of REAL `EvidencePacket` rows returned by
 * `get_evidence_metadata` — node position is cosmetic (angle = index), it
 * never encodes a fabricated relevance/trust score.
 */
export function EvidenceGraph({ agreementId, evidence }: EvidenceGraphProps) {
  const size = 320;
  const center = size / 2;
  const radius = size * 0.36;

  if (evidence.length === 0) {
    return <p className="field-help">No evidence submitted yet — the constellation will populate as packets arrive.</p>;
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height={size}
      role="img"
      aria-label={`Evidence constellation for ${agreementId}: ${evidence.length} evidence packets`}
      style={{ maxWidth: 420 }}
    >
      <circle cx={center} cy={center} r={28} fill="var(--carbon)" stroke="var(--plasma)" strokeWidth={2} />
      <text x={center} y={center + 4} textAnchor="middle" fontSize="10" fill="var(--opaline)" className="mono">
        {agreementId}
      </text>
      {evidence.map((e, i) => {
        const angle = (2 * Math.PI * i) / evidence.length - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const color = e.visibility === "PUBLIC" ? "var(--cyan)" : "var(--tangerine)";
        return (
          <g key={e.evidence_id}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="var(--border-spectral)" strokeWidth={1} />
            <circle cx={x} cy={y} r={10} fill={color} opacity={0.85} />
            <title>{`${e.evidence_id} · ${e.criterion_id} · ${e.mime_type}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
