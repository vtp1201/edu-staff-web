import { describe, expect, it } from "vitest";
import type { TokenResponseDto } from "../dtos/token-response.dto";
import type { UserProfileResponseDto } from "../dtos/user-profile-response.dto";
import { mapProfile, mapSession, mapTokens } from "./auth.mapper";

const tokenDto: TokenResponseDto = {
  accessToken: "acc",
  refreshToken: "ref",
  tokenType: "Bearer",
  sessionId: "sess-1",
};

const profileDto: UserProfileResponseDto = {
  id: "u1",
  email: "a@school.vn",
  name: "An",
  avatar: null,
  roles: [{ role: "TEACHER", tenantId: "t1", tenantName: "THPT A" }],
};

describe("auth.mapper", () => {
  it("mapTokens drops tokenType and keeps the token triple", () => {
    expect(mapTokens(tokenDto)).toEqual({
      accessToken: "acc",
      refreshToken: "ref",
      sessionId: "sess-1",
    });
  });

  it("mapProfile maps identity + roles", () => {
    const user = mapProfile(profileDto);
    expect(user.id).toBe("u1");
    expect(user.roles[0].role).toBe("teacher");
  });

  it("mapProfile preserves the raw BE roleEnum alongside the appRole", () => {
    const user = mapProfile(profileDto);
    expect(user.roles[0].roleEnum).toBe("TEACHER");
    expect(user.roles[0].role).toBe("teacher");
  });

  it("mapProfile collapses MANAGER onto principal appRole but keeps roleEnum", () => {
    const user = mapProfile({
      ...profileDto,
      roles: [{ role: "MANAGER", tenantId: "t2", tenantName: "THPT B" }],
    });
    expect(user.roles[0].role).toBe("principal");
    expect(user.roles[0].roleEnum).toBe("MANAGER");
  });

  it("mapSession merges tokens + user", () => {
    const session = mapSession(tokenDto, profileDto);
    expect(session.accessToken).toBe("acc");
    expect(session.user.email).toBe("a@school.vn");
  });
});
