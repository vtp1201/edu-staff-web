import { describe, expect, it, vi } from "vitest";
import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { TenantMembership } from "../entities/tenant-membership.entity";
import { isSwitchable } from "../entities/tenant-membership.entity";
import type { ITenantRepository } from "../repositories/i-tenant.repository";
import { ListMyMembershipsUseCase } from "./list-my-memberships.use-case";
import { SwitchTenantUseCase } from "./switch-tenant.use-case";

const memberships: TenantMembership[] = [
  { tenantId: "t-acme", roles: ["teacher"], status: "ACTIVE" },
  { tenantId: "t-old", roles: ["parent"], status: "LEFT" },
];

function makeRepo(over: Partial<ITenantRepository> = {}): ITenantRepository {
  return {
    listMyMemberships: vi.fn().mockResolvedValue(memberships),
    switchTenant: vi.fn(),
    ...over,
  };
}

describe("isSwitchable", () => {
  it("only ACTIVE memberships are switchable", () => {
    expect(isSwitchable(memberships[0])).toBe(true);
    expect(isSwitchable(memberships[1])).toBe(false);
  });
});

describe("ListMyMembershipsUseCase", () => {
  it("returns the caller's memberships", async () => {
    const result = await new ListMyMembershipsUseCase(makeRepo()).execute();
    expect(result).toHaveLength(2);
    expect(result[0].tenantId).toBe("t-acme");
  });
});

describe("SwitchTenantUseCase", () => {
  it("delegates to the repo and returns the tenant-scoped tokens", async () => {
    const tokens: AuthTokens = {
      accessToken: "a",
      refreshToken: "r",
      sessionId: "s",
    };
    const switchTenant = vi.fn().mockResolvedValue(tokens);
    const result = await new SwitchTenantUseCase(
      makeRepo({ switchTenant }),
    ).execute("t-acme");
    expect(switchTenant).toHaveBeenCalledWith("t-acme");
    expect(result).toEqual(tokens);
  });
});
