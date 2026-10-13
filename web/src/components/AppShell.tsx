import type { ReactNode } from "react";
import { SpectralNav } from "./SpectralNav";
import { NetworkPill } from "./NetworkPill";
import { WalletConnect } from "./WalletConnect";
import { ErrorBoundary } from "./ErrorBoundary";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SpectralNav />
      <div className="main-area">
        <header className="topbar">
          <NetworkPill />
          <WalletConnect />
        </header>
        <main id="main-content" tabIndex={-1}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
