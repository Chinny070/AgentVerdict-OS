/**
 * Browser-local "bookmarks" for entity IDs (agreement/delegation/challenge
 * IDs) this browser has created or looked up.
 *
 * This is NOT a protocol index: contracts/agentverdict.py exposes no
 * `list_agreements`/`list_challenges`-style enumeration view (only
 * `get_agreement(agreement_id)` etc., each requiring a known ID). Per the
 * design spec section 9 ("browser-local: optional unsent drafts/
 * preferences, explicitly non-authoritative"), this registry only remembers
 * which IDs to look up next time — every value shown for a bookmarked ID is
 * still a live chain read, never read from here.
 */
const PREFIX = "agentverdict:bookmarks:";

export type RegistryKind = "agreements" | "delegations" | "challenges" | "agents";

export function getBookmarks(kind: RegistryKind): string[] {
  try {
    const raw = window.localStorage.getItem(PREFIX + kind);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addBookmark(kind: RegistryKind, id: string): void {
  if (!id) return;
  try {
    const current = getBookmarks(kind);
    if (current.includes(id)) return;
    const next = [id, ...current].slice(0, 50);
    window.localStorage.setItem(PREFIX + kind, JSON.stringify(next));
  } catch {
    // non-fatal: just won't persist
  }
}

export function removeBookmark(kind: RegistryKind, id: string): void {
  try {
    const next = getBookmarks(kind).filter((x) => x !== id);
    window.localStorage.setItem(PREFIX + kind, JSON.stringify(next));
  } catch {
    // ignore
  }
}
