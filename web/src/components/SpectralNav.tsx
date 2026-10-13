import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Landing", group: "Protocol" },
  { to: "/command-deck", label: "Command Deck", group: "Protocol" },
  { to: "/agreements", label: "Agreement Forge", group: "Lifecycle" },
  { to: "/agents", label: "Agent Atlas", group: "Lifecycle" },
  { to: "/missions", label: "Mission Control", group: "Lifecycle" },
  { to: "/evidence", label: "Evidence Observatory", group: "Lifecycle" },
  { to: "/verdicts", label: "Verdict Theater", group: "Lifecycle" },
  { to: "/appeals", label: "Appeals Tribunal", group: "Lifecycle" },
  { to: "/recovery", label: "Recovery Center", group: "Lifecycle" },
  { to: "/settlement", label: "Settlement Ledger", group: "Lifecycle" },
  { to: "/adapters", label: "Adapter Foundry", group: "Developer" },
  { to: "/simulation", label: "Simulation Chamber", group: "Developer" },
  { to: "/telemetry", label: "Protocol Telemetry", group: "Operate" },
  { to: "/settings", label: "Settings", group: "Operate" },
];

export function SpectralNav() {
  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)));

  return (
    <nav className="spectral-nav" aria-label="Primary">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true" />
        <div>
          <div className="brand-name">AgentVerdict OS</div>
          <div className="brand-sub">Protocol console</div>
        </div>
      </div>
      {groups.map((group) => (
        <div key={group}>
          <div className="nav-group-label">{group}</div>
          <ul className="nav-list">
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
