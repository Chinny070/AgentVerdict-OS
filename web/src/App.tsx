import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { WalletProvider } from "./state/WalletContext";
import { ContractAddressProvider } from "./state/ContractAddressContext";
import { ToastProvider } from "./state/ToastContext";

import Landing from "./features/dashboard/Landing";
import CommandDeck from "./features/dashboard/CommandDeck";
import AgreementForge from "./features/agreements/AgreementForge";
import AgentAtlas from "./features/agents/AgentAtlas";
import MissionControl from "./features/missions/MissionControl";
import EvidenceObservatory from "./features/evidence/EvidenceObservatory";
import VerdictTheater from "./features/verdicts/VerdictTheater";
import AppealsTribunal from "./features/appeals/AppealsTribunal";
import RecoveryCenter from "./features/recovery/RecoveryCenter";
import SettlementLedgerScreen from "./features/settlement/SettlementLedgerScreen";
import AdapterFoundry from "./features/developer/AdapterFoundry";
import SimulationChamber from "./features/developer/SimulationChamber";
import ProtocolTelemetry from "./features/telemetry/ProtocolTelemetry";
import Settings from "./features/settings/Settings";

export default function App() {
  return (
    <ToastProvider>
      <ContractAddressProvider>
        <WalletProvider>
          <HashRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/command-deck" element={<CommandDeck />} />
                <Route path="/agreements" element={<AgreementForge />} />
                <Route path="/agents" element={<AgentAtlas />} />
                <Route path="/missions" element={<MissionControl />} />
                <Route path="/evidence" element={<EvidenceObservatory />} />
                <Route path="/verdicts" element={<VerdictTheater />} />
                <Route path="/appeals" element={<AppealsTribunal />} />
                <Route path="/recovery" element={<RecoveryCenter />} />
                <Route path="/settlement" element={<SettlementLedgerScreen />} />
                <Route path="/adapters" element={<AdapterFoundry />} />
                <Route path="/simulation" element={<SimulationChamber />} />
                <Route path="/telemetry" element={<ProtocolTelemetry />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </AppShell>
          </HashRouter>
        </WalletProvider>
      </ContractAddressProvider>
    </ToastProvider>
  );
}
