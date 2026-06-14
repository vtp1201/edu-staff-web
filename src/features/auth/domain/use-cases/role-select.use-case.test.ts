import { describe, expect, it } from "vitest";
import type { UserTenantRole } from "../entities/auth-user.entity";
import { RoleSelectUseCase } from "./role-select.use-case";

const roles: UserTenantRole[] = [
  {
    role: "teacher",
    roleEnum: "TEACHER",
    tenantId: "t1",
    tenantName: "THPT A",
    tenantCode: "A",
  },
  {
    role: "principal",
    roleEnum: "MANAGER",
    tenantId: "t1",
    tenantName: "THPT A",
    tenantCode: "A",
  },
  {
    role: "teacher",
    roleEnum: "TEACHER",
    tenantId: "t2",
    tenantName: "THPT B",
  },
];

describe("RoleSelectUseCase", () => {
  const uc = new RoleSelectUseCase();

  it("matches a BE enum + tenantId to the held tenant role", () => {
    expect(uc.execute("TEACHER", "t1", roles)).toEqual({
      data: {
        appRole: "teacher",
        tenantId: "t1",
        tenantName: "THPT A",
        tenantCode: "A",
      },
    });
  });

  it("resolves MANAGER to principal appRole but matches on the raw enum", () => {
    expect(uc.execute("MANAGER", "t1", roles)).toEqual({
      data: {
        appRole: "principal",
        tenantId: "t1",
        tenantName: "THPT A",
        tenantCode: "A",
      },
    });
  });

  it("distinguishes the same appRole held in two tenants", () => {
    expect(uc.execute("TEACHER", "t1", roles)).toEqual({
      data: {
        appRole: "teacher",
        tenantId: "t1",
        tenantName: "THPT A",
        tenantCode: "A",
      },
    });
    expect(uc.execute("TEACHER", "t2", roles)).toEqual({
      data: {
        appRole: "teacher",
        tenantId: "t2",
        tenantName: "THPT B",
        tenantCode: undefined,
      },
    });
  });

  it("returns unauthorized when the enum is not held", () => {
    expect(uc.execute("STUDENT", "t1", roles)).toEqual({
      error: { type: "unauthorized" },
    });
  });

  it("returns unauthorized for a valid enum but wrong tenantId", () => {
    expect(uc.execute("MANAGER", "t2", roles)).toEqual({
      error: { type: "unauthorized" },
    });
  });
});
