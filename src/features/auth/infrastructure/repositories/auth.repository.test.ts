import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { AUTH_EP } from "@/bootstrap/endpoint/auth.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { AuthRepository } from "./auth.repository";

// The http interceptor already unwraps the envelope (US-E06.1), so the repo's
// `http` resolves to the payload directly and rejects with a normalised
// ApiError. Tests mock at that boundary.
function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

const tokenData = {
  accessToken: "acc-1",
  refreshToken: "ref-1",
  tokenType: "Bearer",
  sessionId: "sess-1",
};

const profileData = {
  id: "u1",
  email: "a@school.vn",
  name: "An",
  avatar: null,
  roles: [{ role: "TEACHER", tenantId: "t1", tenantName: "THPT A" }],
};

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return { post: vi.fn(), get: vi.fn(), ...over } as unknown as AxiosInstance;
}

describe("AuthRepository.signin", () => {
  it("posts AUTH_EP.signin then GETs AUTH_EP.me with the fresh bearer token", async () => {
    const http = makeHttp({
      post: vi.fn().mockResolvedValue(tokenData),
      get: vi.fn().mockResolvedValue(profileData),
    });
    const repo = new AuthRepository(http);

    const result = await repo.signin("a@school.vn", "pw");

    expect(http.post).toHaveBeenCalledWith(AUTH_EP.signin, {
      email: "a@school.vn",
      password: "pw",
    });
    expect(http.get).toHaveBeenCalledWith(AUTH_EP.me, {
      headers: { Authorization: "Bearer acc-1" },
    });
    expect(result.data).toEqual({
      accessToken: "acc-1",
      refreshToken: "ref-1",
      sessionId: "sess-1",
      user: {
        id: "u1",
        email: "a@school.vn",
        name: "An",
        avatar: null,
        emailVerified: false,
        roles: [
          {
            role: "teacher",
            roleEnum: "TEACHER",
            tenantId: "t1",
            tenantName: "THPT A",
          },
        ],
      },
    });
  });

  it("maps an error envelope to a typed failure", async () => {
    const http = makeHttp({
      post: vi
        .fn()
        .mockRejectedValue(apiError("USER_INVALID_CREDENTIALS", 401)),
    });
    const result = await new AuthRepository(http).signin("a@school.vn", "bad");
    expect(result.error).toEqual({ type: "invalid-credentials" });
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("AuthRepository.socialSignin", () => {
  it("posts AUTH_EP.social then GETs AUTH_EP.me with the fresh bearer token", async () => {
    const http = makeHttp({
      post: vi.fn().mockResolvedValue(tokenData),
      get: vi.fn().mockResolvedValue(profileData),
    });
    const repo = new AuthRepository(http);

    const result = await repo.socialSignin("google", "id-token-1");

    expect(http.post).toHaveBeenCalledWith(AUTH_EP.social, {
      provider: "google",
      token: "id-token-1",
    });
    expect(http.get).toHaveBeenCalledWith(AUTH_EP.me, {
      headers: { Authorization: "Bearer acc-1" },
    });
    expect(result.data?.user.roles).toEqual([
      {
        role: "teacher",
        roleEnum: "TEACHER",
        tenantId: "t1",
        tenantName: "THPT A",
      },
    ]);
  });

  it("maps an UNAUTHORIZED rejection to a typed failure", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("UNAUTHORIZED_ACCESS", 401)),
    });
    const result = await new AuthRepository(http).socialSignin("google", "bad");
    expect(result.error).toEqual({ type: "unauthorized" });
    expect(http.get).not.toHaveBeenCalled();
  });

  it("maps a transport failure (no status) to network-error", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    });
    const result = await new AuthRepository(http).socialSignin("google", "tok");
    expect(result.error).toEqual({ type: "network-error" });
  });
});

describe("AuthRepository.refresh", () => {
  it("posts /auth/refresh and returns the rotated token triple", async () => {
    const rotated = {
      ...tokenData,
      accessToken: "acc-2",
      refreshToken: "ref-2",
    };
    const http = makeHttp({
      post: vi.fn().mockResolvedValue(rotated),
    });
    const result = await new AuthRepository(http).refresh("ref-1");

    expect(http.post).toHaveBeenCalledWith(AUTH_EP.refresh, {
      refreshToken: "ref-1",
    });
    expect(result.data).toEqual({
      accessToken: "acc-2",
      refreshToken: "ref-2",
      sessionId: "sess-1",
    });
  });

  it("maps a rotated-token reuse rejection to invalid-token", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("INVALID_TOKEN", 401)),
    });
    const result = await new AuthRepository(http).refresh("stale");
    expect(result.error).toEqual({ type: "invalid-token" });
  });
});

describe("AuthRepository.signout", () => {
  it("posts /auth/signout without a body", async () => {
    const http = makeHttp({ post: vi.fn().mockResolvedValue(null) });
    await new AuthRepository(http).signout();
    expect(http.post).toHaveBeenCalledWith(AUTH_EP.signout);
  });

  it("swallows revoke errors so local logout still proceeds", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(new Error("network down")),
    });
    await expect(new AuthRepository(http).signout()).resolves.toBeUndefined();
  });
});

describe("AuthRepository.getProfile", () => {
  it("GETs AUTH_EP.me and maps the profile (incl. emailVerified)", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue({ ...profileData, isEmailVerified: true }),
    });
    const result = await new AuthRepository(http).getProfile();
    expect(http.get).toHaveBeenCalledWith(AUTH_EP.me);
    expect(result.data?.email).toBe("a@school.vn");
    expect(result.data?.emailVerified).toBe(true);
  });

  it("defaults emailVerified to false when the wire field is absent", async () => {
    const http = makeHttp({ get: vi.fn().mockResolvedValue(profileData) });
    const result = await new AuthRepository(http).getProfile();
    expect(result.data?.emailVerified).toBe(false);
  });

  it("maps an UNAUTHORIZED rejection to a typed failure", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("UNAUTHORIZED_ACCESS", 401)),
    });
    const result = await new AuthRepository(http).getProfile();
    expect(result.error).toEqual({ type: "unauthorized" });
  });
});

describe("AuthRepository.requestEmailVerification", () => {
  it("posts to the verification endpoint (no body) and returns ok on 204", async () => {
    const http = makeHttp({ post: vi.fn().mockResolvedValue(undefined) });
    const result = await new AuthRepository(http).requestEmailVerification();
    expect(http.post).toHaveBeenCalledWith(AUTH_EP.requestEmailVerification);
    expect(result.ok).toBe(true);
  });

  it("maps a 429 to too-many-requests", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("RATE_LIMIT_EXCEEDED", 429)),
    });
    const result = await new AuthRepository(http).requestEmailVerification();
    expect(result.error).toEqual({ type: "too-many-requests" });
  });

  it("maps a transport failure to network-error", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    });
    const result = await new AuthRepository(http).requestEmailVerification();
    expect(result.error).toEqual({ type: "network-error" });
  });
});

describe("AuthRepository.confirmEmailVerification", () => {
  it("posts { otp } and returns ok on 204", async () => {
    const http = makeHttp({ post: vi.fn().mockResolvedValue(undefined) });
    const result = await new AuthRepository(http).confirmEmailVerification(
      "123456",
    );
    expect(http.post).toHaveBeenCalledWith(AUTH_EP.confirmEmailVerification, {
      otp: "123456",
    });
    expect(result.ok).toBe(true);
  });

  it("maps USER_INVALID_OTP → invalid-otp", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("USER_INVALID_OTP", 400)),
    });
    const result = await new AuthRepository(http).confirmEmailVerification(
      "111111",
    );
    expect(result.error).toEqual({ type: "invalid-otp" });
  });

  it("maps USER_OTP_EXPIRED → otp-expired", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("USER_OTP_EXPIRED", 400)),
    });
    const result = await new AuthRepository(http).confirmEmailVerification(
      "000000",
    );
    expect(result.error).toEqual({ type: "otp-expired" });
  });

  it("maps USER_TOO_MANY_ATTEMPTS (429) → too-many-requests (lockout)", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("USER_TOO_MANY_ATTEMPTS", 429)),
    });
    const result = await new AuthRepository(http).confirmEmailVerification(
      "222222",
    );
    expect(result.error).toEqual({ type: "too-many-requests" });
  });
});
