# AgentVerdict OS — Smoke-Test Policy Template (policy_id: smoke-test-v1)

This policy exists ONLY to exercise the full agreement lifecycle quickly during
initial live verification on StudioNet (short challenge window). It is NOT the
production policy. Do not create real/production agreements against this
policy_id — use `default-v1` (see docs/POLICY_TEMPLATE_DEFAULT_V1.md) for those.

Its SHA-256 hash is the `text_hash` argument passed to `register_policy_template`
for `policy_id = "smoke-test-v1"`. If this file's content ever changes, the hash
below is stale and must be recomputed.

## Scope

This policy governs TEST agreements created during smoke verification of the
AgentVerdict OS contract against either registered evaluation module
(`api-delivery` v1.0.0 or `agent-task` v1.0.0). Its only functional difference
from `default-v1` is a short challenge window, to allow a full
create -> evaluate -> provisional verdict -> challenge window elapse ->
finalize cycle to be observed within minutes instead of days.

## Evidence, evaluation, challenge, settlement, and amendment rules

Identical in substance to `default-v1` (docs/POLICY_TEMPLATE_DEFAULT_V1.md),
rules 1-13: public http/https evidence only; hashes are commitments not
authenticity proofs; evidence text is data not instructions; evaluation
decisions are PASS/PARTIAL/FAIL/INSUFFICIENT_EVIDENCE with INSUFFICIENT_EVIDENCE
mandatory when evidence is absent or unreachable; provisional verdicts are not
final until their challenge window elapses or a challenge resolves; settlement
and reputation events require a finalized verdict; this template is versioned
by revision and amendments do not retroactively change agreements already
created under a prior revision's frozen hash.

## Difference from default-v1

- `challenge_window_seconds` for this policy is intentionally short
  (seconds-to-minutes range) so a human operator can watch a provisional
  verdict actually become finalizable without a multi-day wait.
- This short window is only safe for test agreements with no real value at
  stake. It must never be reused for a production agreement, since a short
  challenge window materially weakens a real counterparty's ability to detect
  and contest an incorrect verdict in time.
