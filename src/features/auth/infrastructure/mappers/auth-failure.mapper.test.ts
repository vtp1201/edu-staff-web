import { describe, expect, it } from "vitest";
import { mapAuthError } from "./auth-failure.mapper";

function axiosErr(status: number, code?: string) {
  return {
    response: {
      status,
      data: code ? { success: false, error: { code } } : { success: false },
    },
  };
}

describe("mapAuthError", () => {
  it("maps known IAM error codes", () => {
    expect(mapAuthError(axiosErr(401, "USER_INVALID_CREDENTIALS"))).toEqual({
      type: "invalid-credentials",
    });
    expect(mapAuthError(axiosErr(401, "TOKEN_EXPIRED"))).toEqual({
      type: "token-expired",
    });
    expect(mapAuthError(axiosErr(409, "USER_EMAIL_ALREADY_EXISTS"))).toEqual({
      type: "email-already-exists",
    });
  });

  it("maps absence of response to network-error", () => {
    expect(mapAuthError(new Error("ECONNREFUSED"))).toEqual({
      type: "network-error",
    });
  });

  it("maps gateway/upstream statuses (502/503/504) to network-error", () => {
    for (const status of [502, 503, 504]) {
      expect(mapAuthError(axiosErr(status))).toEqual({ type: "network-error" });
      expect(mapAuthError(axiosErr(status, "BAD_GATEWAY"))).toEqual({
        type: "network-error",
      });
    }
  });

  it("lets a recognised code win over the status (branch on code, never status)", () => {
    // Pins `.claude/rules/api-integration.md`: hoisting the gateway-status
    // check above CODE_MAP would silently violate it while staying green.
    expect(mapAuthError(axiosErr(503, "TOKEN_EXPIRED"))).toEqual({
      type: "token-expired",
    });
    expect(mapAuthError(axiosErr(429, "USER_INVALID_CREDENTIALS"))).toEqual({
      type: "invalid-credentials",
    });
  });

  it("falls back to unknown for unrecognized codes with a response", () => {
    const f = mapAuthError(axiosErr(500, "WEIRD_CODE"));
    expect(f.type).toBe("unknown");
    expect(mapAuthError(axiosErr(418, "TEAPOT")).type).toBe("unknown");
  });
});
