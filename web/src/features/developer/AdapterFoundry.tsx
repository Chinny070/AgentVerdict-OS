import { AdapterCatalog } from "../../components/AdapterCatalog";
import { CONTRACT_METHODS } from "../../chain/schema";

export default function AdapterFoundry() {
  return (
    <div>
      <h1>Adapter Foundry</h1>
      <p className="field-help">
        Developer documentation for the two real evaluation modules, and the full typed method manifest this
        frontend binds against (transcribed from contracts/agentverdict.py, not the design spec's "conceptual"
        names list).
      </p>

      <h2>Evaluation modules</h2>
      <AdapterCatalog />

      <h2 style={{ marginTop: "var(--space-7)" }}>Contract method manifest</h2>
      <p className="field-help">
        Feature 22 (Universal Evaluation Adapter SDK) is DEFERRED — there is no third-party adapter
        registration flow. This table is read-only reference documentation of the real deployed surface.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Method</th>
            <th scope="col">Kind</th>
            <th scope="col">Params</th>
            <th scope="col">Returns</th>
          </tr>
        </thead>
        <tbody>
          {CONTRACT_METHODS.map((m) => (
            <tr key={m.name}>
              <td className="mono">{m.name}</td>
              <td>{m.mutability}</td>
              <td className="mono">{m.params.map((p) => p.name).join(", ") || "—"}</td>
              <td>{m.returns}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
