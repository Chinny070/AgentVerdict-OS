import { useState } from "react";
import { addBookmark, getBookmarks, removeBookmark, type RegistryKind } from "../state/localRegistry";

interface IdPickerProps {
  kind: RegistryKind;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (id: string) => void;
}

/** Manual-entry + browser-local bookmark picker — see state/localRegistry.ts for why this exists. */
export function IdPicker({ kind, label, placeholder, value, onChange }: IdPickerProps) {
  const [bookmarks, setBookmarks] = useState(() => getBookmarks(kind));

  const refresh = () => setBookmarks(getBookmarks(kind));

  const handleUse = (id: string) => {
    onChange(id);
  };

  const handleBookmarkCurrent = () => {
    if (!value) return;
    addBookmark(kind, value);
    refresh();
  };

  return (
    <div className="field">
      <label htmlFor={`id-picker-${kind}`}>{label}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id={`id-picker-${kind}`}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleBookmarkCurrent}>
          Bookmark
        </button>
      </div>
      {bookmarks.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {bookmarks.map((id) => (
            <span key={id} className="mono-chip">
              <button type="button" className="copy-btn" onClick={() => handleUse(id)}>
                {id}
              </button>
              <button
                type="button"
                className="copy-btn"
                style={{ color: "var(--coral)" }}
                aria-label={`Remove bookmark ${id}`}
                onClick={() => {
                  removeBookmark(kind, id);
                  refresh();
                }}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
      <span className="field-help">
        Bookmarks are saved only in this browser (not canonical protocol state) so you don't have to retype IDs.
      </span>
    </div>
  );
}
