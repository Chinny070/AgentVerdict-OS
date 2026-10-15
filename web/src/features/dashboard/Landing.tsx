import { Link } from "react-router-dom";
import { GENLAYER_JS_VERSION, STAGE_11_CONTRACT_ADDRESS, STUDIONET_CHAIN_ID, shortenAddress } from "../../chain/config";

export default function Landing() {
  return (
    <div>
      <section className="hero">
        <div>
          <span className="badge badge-active" style={{ marginBottom: 14 }}>
            StudioNet · chain {STUDIONET_CHAIN_ID}
          </span>
          <h1>The universal accountability layer for autonomous work.</h1>
          <p>
            Natural-language agreements become evidence-backed, challengeable, settlement-authorizing
            decisions on GenLayer. AgentVerdict OS is a single Intelligent Contract that adjudicates whether
            submitted public evidence satisfies a frozen rubric — using a real leader/validator GenVM
            evaluation, not a scripted or simulated judgment.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/command-deck" className="btn btn-primary">
              Open Command Deck
            </Link>
            <Link to="/adapters" className="btn btn-ghost">
              Read the module docs
            </Link>
          </div>
        </div>
        <div className="panel spectral-edge">
          <h3>What is actually real here</h3>
          <ul>
            <li>
              Stage 11 is deployed on StudioNet. Its finality, bounded-challenge, evidence validation, and
              recovery behavior were exercised in two synthetic zero-value lifecycles.
            </li>
            <li>Two real flagship evaluation modules: API Delivery Verification, AI-Agent Task Verification.</li>
            <li>
              Live on StudioNet at <strong>Stage 11</strong> (<code>{shortenAddress(STAGE_11_CONTRACT_ADDRESS)}</code>),
              the hardened deployment this console targets by default — genlayer-js@{GENLAYER_JS_VERSION}{" "}
              reads and writes real on-chain state.
            </li>
            <li>
              The Stage 11 lifecycles exercised evaluation, challenge resolution, rework, timeout recovery,
              finalization, reputation, and receipt-only settlement (see the deployment records).
            </li>
          </ul>
          <h3>What is honestly not yet real</h3>
          <ul>
            <li>
              Settlement is an authorization receipt only — no real asset custody exists in this build
              (native GEN transfer is disabled by default).
            </li>
            <li>
              Writes require your own connected wallet; the app never holds or sends signing keys.
            </li>
            <li>
              V1 and V2 remain queryable as historical deployments — see Settings for their addresses.
            </li>
            <li>
              The public frontend is being verified against Stage 11. Settlement remains receipt-only and
              native GEN transfers are disabled.
            </li>
          </ul>
        </div>
      </section>

      <section className="grid grid-3">
        <article className="panel">
          <h3>Agreement Forge</h3>
          <p>Draft a rubric, propose it, and freeze the policy + module version on acceptance.</p>
        </article>
        <article className="panel">
          <h3>Verdict Theater</h3>
          <p>Inspect structured criterion findings, citations, and uncertainty for a real evaluation.</p>
        </article>
        <article className="panel">
          <h3>Appeals Tribunal</h3>
          <p>Challenge a provisional verdict within its on-chain deadline; see finality honestly distinguished.</p>
        </article>
      </section>
    </div>
  );
}
