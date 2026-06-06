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

  it("falls back to unknown for unrecognized codes with a response", () => {
    const f = mapAuthError(axiosErr(500, "WEIRD_CODE"));
    expect(f.type).toBe("unknown");
  });
});
