import { Link } from "react-router-dom";
import { GENLAYER_JS_VERSION, STUDIONET_CHAIN_ID, V2_CONTRACT_ADDRESS, shortenAddress } from "../../chain/config";

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
              The deployed V2 contract has a real StudioNet verification record. The current Stage 11 source
              candidate passes 92 direct-mode contract tests; its correctness fixes are not yet deployed.
            </li>
            <li>Two real flagship evaluation modules: API Delivery Verification, AI-Agent Task Verification.</li>
            <li>
              Live on StudioNet at <strong>V2</strong> (<code>{shortenAddress(V2_CONTRACT_ADDRESS)}</code>),
              the Stage-6 deployment this console targets by default — genlayer-js@{GENLAYER_JS_VERSION}{" "}
              reads and writes real on-chain state. Stage 11 candidate fixes require a separate deployment.
            </li>
            <li>
              Every public write method on V2 has been exercised at least once via real signed transactions
              (see docs/V2_STUDIONET_LIVE_VERIFICATION_REPORT.md and
              docs/V2_REMAINING_PATHS_VERIFICATION_REPORT.md).
            </li>
          </ul>
          <h3>What is honestly not yet real</h3>
          <ul>
            <li>
              Settlement is an authorization receipt only — no real asset custody exists in this build
              (native GEN transfer is disabled by default).
            </li>
            <li>
              This browser session has no signing key, by design — every write action requires your own
              connected wallet; nothing here signs or sends a transaction on your behalf.
            </li>
            <li>
              V1 (the original, pre-Stage-6 deployment) remains queryable but historical — see Settings for
              both addresses.
            </li>
            <li>
              V1 and V2 do not contain the local Stage 11 hardening; the latest code is a candidate pending
              separate deployment and live verification.
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
