import { describe, expect, it } from "vitest";
import { serializeRubric, validateAgreementDraft, type AgreementDraft } from "./AgreementEditor";

describe("serializeRubric", () => {
  it("matches the contract's rubric object schema", () => {
    const criteria = [{ id: "endpoint_coverage", description: "GET returns 200" }];
    expect(JSON.parse(serializeRubric(criteria))).toEqual({ criteria });
  });
});

describe("validateAgreementDraft", () => {
  const validDraft: AgreementDraft = {
    counterparty: "0x1111111111111111111111111111111111111111",
    policyId: "smoke-test-v2",
    moduleId: "api-delivery",
    amountAtto: "0",
    deadline: "2030-01-01T00:00",
    rubric: [{ id: "endpoint_coverage", description: "GET returns 200" }],
  };

  it("rejects a missing deadline before any wallet transaction is submitted", () => {
    expect(validateAgreementDraft({ ...validDraft, deadline: "" }, Date.parse("2029-01-01"))).toMatch(/future agreement deadline/);
  });

  it("rejects duplicate rubric criterion IDs", () => {
    expect(validateAgreementDraft({
      ...validDraft,
      rubric: [
        { id: "endpoint_coverage", description: "one" },
        { id: "endpoint_coverage", description: "two" },
      ],
    }, Date.parse("2029-01-01"))).toMatch(/unique/);
  });

  it("accepts a future deadline and well-formed rubric", () => {
    expect(validateAgreementDraft(validDraft, Date.parse("2029-01-01"))).toBeNull();
  });
});
