import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { AUTH_EP } from "@/bootstrap/endpoint/auth.endpoint";
import { AuthRepository } from "./auth.repository";

function envelope<T>(data: T) {
  return { success: true, data, error: null, meta: {} };
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
  roles: [{ role: "teacher", tenantId: "t1", tenantName: "THPT A" }],
};

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return { post: vi.fn(), get: vi.fn(), ...over } as unknown as AxiosInstance;
}

describe("AuthRepository.signin", () => {
  it("posts /auth/signin then GETs /users/me with the fresh bearer token", async () => {
    const http = makeHttp({
      post: vi.fn().mockResolvedValue(envelope(tokenData)),
      get: vi.fn().mockResolvedValue(envelope(profileData)),
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
        roles: [{ role: "teacher", tenantId: "t1", tenantName: "THPT A" }],
      },
    });
  });

  it("maps an error envelope to a typed failure", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { error: { code: "USER_INVALID_CREDENTIALS" } },
        },
      }),
    });
    const result = await new AuthRepository(http).signin("a@school.vn", "bad");
    expect(result.error).toEqual({ type: "invalid-credentials" });
    expect(http.get).not.toHaveBeenCalled();
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
      post: vi.fn().mockResolvedValue(envelope(rotated)),
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
      post: vi.fn().mockRejectedValue({
        response: { status: 401, data: { error: { code: "INVALID_TOKEN" } } },
      }),
    });
    const result = await new AuthRepository(http).refresh("stale");
    expect(result.error).toEqual({ type: "invalid-token" });
  });
});

describe("AuthRepository.signout", () => {
  it("posts /auth/signout without a body", async () => {
    const http = makeHttp({ post: vi.fn().mockResolvedValue(envelope(null)) });
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
