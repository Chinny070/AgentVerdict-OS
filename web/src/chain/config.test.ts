import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONTRACT_ADDRESS,
  STAGE_12_CONTRACT_ADDRESS,
  V2_CONTRACT_ADDRESS,
  getConfiguredContractAddress,
  resetToDefaultContractAddress,
  setConfiguredContractAddress,
} from "./config";

describe("contract address selection", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses the verified Stage 12 deployment by default", () => {
    expect(DEFAULT_CONTRACT_ADDRESS).toBe(STAGE_12_CONTRACT_ADDRESS);
    expect(getConfiguredContractAddress()).toBe(STAGE_12_CONTRACT_ADDRESS);
  });

  it("keeps explicit historical deployment selection available", () => {
    setConfiguredContractAddress(V2_CONTRACT_ADDRESS);
    expect(getConfiguredContractAddress()).toBe(V2_CONTRACT_ADDRESS);
  });

  it("reset removes the override and returns to Stage 12", () => {
    setConfiguredContractAddress(V2_CONTRACT_ADDRESS);
    resetToDefaultContractAddress();
    expect(getConfiguredContractAddress()).toBe(STAGE_12_CONTRACT_ADDRESS);
  });
});
