import { STUDIONET_CHAIN_ID } from "../chain/config";
import { useContractAddress } from "../state/ContractAddressContext";

export function NetworkPill() {
  const { isConfigured } = useContractAddress();
  return (
    <div className="mono-chip" title={`StudioNet, chain id ${STUDIONET_CHAIN_ID}`}>
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isConfigured ? "var(--mint)" : "var(--tangerine)",
        }}
      />
      StudioNet · chain {STUDIONET_CHAIN_ID}
      {!isConfigured && <span className="field-help">· no contract configured</span>}
    </div>
  );
}
