import { useState } from "react";
import { shortenAddress } from "../chain/config";

interface CopyHashProps {
  value: string;
  shorten?: boolean;
  label?: string;
}

export function CopyHash({ value, shorten = true, label }: CopyHashProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (permissions, insecure context); fail silently,
      // the raw value is still visible in the DOM for manual copy.
    }
  };

  const display = shorten ? shortenAddress(value, 6) : value;

  return (
    <span className="mono-chip">
      {label && <span className="field-help">{label}</span>}
      <span title={value}>{display}</span>
      <button type="button" className="copy-btn" onClick={handleCopy} aria-label={`Copy ${label ?? "value"} to clipboard`}>
        {copied ? "copied" : "copy"}
      </button>
    </span>
  );
}
