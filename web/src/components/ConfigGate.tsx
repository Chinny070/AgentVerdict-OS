import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useContractAddress } from "../state/ContractAddressContext";
import { EmptyState } from "./EmptyState";

/** Wraps any screen that needs a configured contract address. */
export function ConfigGate({ children }: { children: ReactNode }) {
  const { isConfigured } = useContractAddress();
  if (!isConfigured) {
    return (
      <EmptyState
        icon="⬡"
        title="No contract configured"
        description="This protocol console has no deployed AgentVerdictOS address yet. Set one on the Settings screen once a human with a StudioNet signing key has deployed the contract. Nothing below is fabricated — it is simply not fetchable yet."
        action={
          <Link to="/settings" className="btn btn-primary btn-sm">
            Go to Settings
          </Link>
        }
      />
    );
  }
  return <>{children}</>;
}
