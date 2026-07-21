import { describe, expect, it } from "vitest";
import { parentConsentVmGate } from "./consent-gate";

describe("parentConsentVmGate", () => {
  it("populates parentConsent=true for the parent role", () => {
    expect(parentConsentVmGate("parent")).toEqual({ parentConsent: true });
  });

  it.each([
    "teacher",
    "principal",
    "student",
    "admin",
    "",
  ])("OMITS the parentConsent field entirely for %s (not false — AC-007.2)", (role) => {
    const gate = parentConsentVmGate(role);
    expect("parentConsent" in gate).toBe(false);
    expect(gate).toEqual({});
  });
});
