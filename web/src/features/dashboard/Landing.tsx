import { Link } from "react-router-dom";
import { GENLAYER_JS_VERSION, STUDIONET_CHAIN_ID } from "../../chain/config";

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
            <li>A lint-clean, 68/68-test-passing GenLayer Intelligent Contract (see docs/TEST_EVIDENCE.md).</li>
            <li>Two real flagship evaluation modules: API Delivery Verification, AI-Agent Task Verification.</li>
            <li>genlayer-js@{GENLAYER_JS_VERSION} wired to real reads/writes once a contract address is configured.</li>
          </ul>
          <h3>What is honestly not yet real</h3>
          <ul>
            <li>No StudioNet deployment has happened — this agent has no signing key, by design.</li>
            <li>Settlement is an authorization receipt only. No real asset custody exists in this build.</li>
            <li>Until an address is configured on Settings, every chain-dependent screen shows an empty state.</li>
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
