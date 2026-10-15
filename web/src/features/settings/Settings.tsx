import { useState } from "react";
import {
  GENLAYER_JS_VERSION,
  STUDIONET_CHAIN_ID,
  STUDIONET_EXPLORER_URL,
  STUDIONET_RPC_URL,
  STAGE_11_CONTRACT_ADDRESS,
  STAGE_12_CONTRACT_ADDRESS,
  V1_CONTRACT_ADDRESS,
  V2_CONTRACT_ADDRESS,
} from "../../chain/config";
import { useContractAddress } from "../../state/ContractAddressContext";
import { useWallet } from "../../state/WalletContext";
import { verifyLiveSchema, type SchemaVerificationResult } from "../../chain/schema";
import { shortenAddress } from "../../chain/config";

export default function Settings() {
  const { address, isDefault, setAddress, clearAddress, resetToDefault } = useContractAddress();
  const { wallet, hasProvider } = useWallet();
  const [input, setInput] = useState(address ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [verification, setVerification] = useState<SchemaVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSave = () => {
    const result = setAddress(input);
    setFormError(result.ok ? null : result.error ?? "Invalid address.");
  };

  const handleVerify = async () => {
    if (!address) return;
    setVerifying(true);
    try {
      const result = await verifyLiveSchema(address as `0x${string}`);
      setVerification(result);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <h1>Settings &amp; Diagnostics</h1>

      <div className="panel">
        <h2>Deployed contract address</h2>
        <p className="field-help">
          This build defaults to <strong>Stage 12</strong> (<code>{shortenAddress(STAGE_12_CONTRACT_ADDRESS)}</code>), the
          current StudioNet target. Its deployed source hash matches this repository; timeout recovery
          and zero-value settlement were verified live. Attempt-three terminalization has direct-mode
          regression coverage but has not been separately exercised on-chain (see <code>deployments/studionet.json</code>).
          Override it below to point at a different
          deployment (e.g. V1, historical, see below) or your own. Stored only in this browser's
          localStorage — a client preference, never canonical protocol state.
        </p>
        <div className="field">
          <label htmlFor="addr">Contract address</label>
          <input id="addr" type="text" placeholder="0x..." value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        {formError && (
          <p role="alert" style={{ color: "var(--coral)" }}>
            {formError}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save address
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              resetToDefault();
              setInput(STAGE_12_CONTRACT_ADDRESS);
              setVerification(null);
            }}
          >
            Reset to default (Stage 12)
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              clearAddress();
              setInput("");
              setVerification(null);
            }}
          >
            Disconnect (show no contract)
          </button>
        </div>
        {address ? (
          <p className="field-help" style={{ marginTop: 8 }}>
            Currently configured: <strong>{shortenAddress(address)}</strong>
            {isDefault && " (built-in default — Stage 12)"}
          </p>
        ) : (
          <p className="field-help" style={{ marginTop: 8 }}>
            Currently configured: <strong>none</strong> (explicitly disconnected)
          </p>
        )}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Stage 11 — previous hardened deployment</h2>
        <p className="field-help">
          <code className="mono">{STAGE_11_CONTRACT_ADDRESS}</code> remains available for comparison.
          It predates the attempt-exhaustion terminal transition in Stage 12.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => setInput(STAGE_11_CONTRACT_ADDRESS)}>
          Fill in Stage 11 address
        </button>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>V2 — historical Stage 6 deployment</h2>
        <p className="field-help">
          <code className="mono">{V2_CONTRACT_ADDRESS}</code> remains available for historical comparison.
          New interactions should use the Stage 12 default above.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => setInput(V2_CONTRACT_ADDRESS)}>
          Fill in V2 address
        </button>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>V1 — historical deployment (superseded)</h2>
        <p className="field-help">
          <code className="mono">{V1_CONTRACT_ADDRESS}</code> is the original Stage 0-4 deployment and
          retains two finalized agreements (<strong>A-1</strong>, <strong>A-2</strong>) as historical evidence.
          It predates the Stage 6 and Stage 11 hardening. It remains queryable and is no longer the default
          target for new interactions. Paste it into the address field above and click "Save address" to inspect it.
        </p>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setInput(V1_CONTRACT_ADDRESS)}
        >
          Fill in V1 address
        </button>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Live schema verification</h2>
        <p className="field-help">
          Fetches the REAL on-chain schema via genlayer-js's <code>getContractSchema</code> and diffs it
          against this frontend's static method manifest (chain/schema.ts). Catches drift instead of silently
          trusting a stale manifest.
        </p>
        <button className="btn btn-ghost btn-sm" disabled={!address || verifying} onClick={handleVerify}>
          {verifying ? "Checking…" : "Verify live schema"}
        </button>
        {!address && <p className="field-help">Configure a contract address first.</p>}
        {verification && (
          <div style={{ marginTop: 10 }}>
            <span className={`badge ${verification.ok ? "badge-confirmed" : "badge-failed"}`}>
              {verification.ok ? "Schema matches" : "Schema mismatch or unreachable"}
            </span>
            {verification.error && <p className="field-help">{verification.error}</p>}
            {verification.missingFromLive.length > 0 && (
              <p className="field-help">Methods expected but not found live: {verification.missingFromLive.join(", ")}</p>
            )}
            {verification.extraOnLive.length > 0 && (
              <p className="field-help">Methods live but not in manifest: {verification.extraOnLive.join(", ")}</p>
            )}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Network diagnostics</h2>
        <dl className="grid grid-2">
          <div>
            <dt className="field-help">Chain ID</dt>
            <dd>{STUDIONET_CHAIN_ID}</dd>
          </div>
          <div>
            <dt className="field-help">RPC</dt>
            <dd className="mono">{STUDIONET_RPC_URL}</dd>
          </div>
          <div>
            <dt className="field-help">Explorer</dt>
            <dd>
              <a href={STUDIONET_EXPLORER_URL} target="_blank" rel="noreferrer">
                {STUDIONET_EXPLORER_URL}
              </a>
            </dd>
          </div>
          <div>
            <dt className="field-help">genlayer-js</dt>
            <dd className="mono">{GENLAYER_JS_VERSION}</dd>
          </div>
          <div>
            <dt className="field-help">Injected wallet provider</dt>
            <dd>{hasProvider ? "Detected" : "Not detected (window.ethereum is undefined)"}</dd>
          </div>
          <div>
            <dt className="field-help">Wallet connection</dt>
            <dd>{wallet ? shortenAddress(wallet.address) : "Not connected"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
