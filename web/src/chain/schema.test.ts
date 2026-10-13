import { describe, expect, it } from "vitest";
import { CONTRACT_METHODS, getMethodSpec } from "./schema";

/**
 * Cross-checks the static manifest against the real contract surface
 * (contracts/agentverdict.py). This is a regression guard: if the Python
 * contract's public method signatures ever change without this manifest
 * being updated, these specific assertions should start failing.
 */
describe("CONTRACT_METHODS manifest", () => {
  it("includes exactly the documented 40 public methods (12 view + 28 write) per genvm-lint --json (Stage 6 added resolve_challenge_by_timeout)", () => {
    expect(CONTRACT_METHODS).toHaveLength(40);
    const viewCount = CONTRACT_METHODS.filter((m) => m.mutability === "view").length;
    const writeCount = CONTRACT_METHODS.filter((m) => m.mutability === "write").length;
    expect(viewCount).toBe(12);
    expect(writeCount).toBe(28);
  });

  it("resolve_challenge_by_timeout takes only a challenge_id (permissionless by design, see docs/STAGE_6_MIGRATION_NOTE.md)", () => {
    const spec = getMethodSpec("resolve_challenge_by_timeout");
    expect(spec?.mutability).toBe("write");
    expect(spec?.params.map((p) => p.name)).toEqual(["challenge_id"]);
  });

  it("create_agreement has the exact parameter order the contract expects", () => {
    const spec = getMethodSpec("create_agreement");
    expect(spec).toBeDefined();
    expect(spec?.params.map((p) => p.name)).toEqual([
      "counterparty",
      "policy_id",
      "module_id",
      "amount_atto",
      "deadline",
      "rubric_json",
    ]);
  });

  it("get_protocol_stats is a parameterless view", () => {
    const spec = getMethodSpec("get_protocol_stats");
    expect(spec?.mutability).toBe("view");
    expect(spec?.params).toHaveLength(0);
  });

  it("record_settlement takes only an agreement_id (idempotency is enforced on-chain, not by extra params)", () => {
    const spec = getMethodSpec("record_settlement");
    expect(spec?.params.map((p) => p.name)).toEqual(["agreement_id"]);
  });

  it("returns undefined for a method name that does not exist on the contract", () => {
    expect(getMethodSpec("not_a_real_method")).toBeUndefined();
  });
});
