import { describe, expect, it } from "vitest";
import type { UserTenantRole } from "../entities/auth-user.entity";
import { RoleSelectUseCase } from "./role-select.use-case";

const roles: UserTenantRole[] = [
  { role: "teacher", tenantId: "t1", tenantName: "THPT A", tenantCode: "A" },
  { role: "principal", tenantId: "t2", tenantName: "THPT B" },
];

describe("RoleSelectUseCase", () => {
  const uc = new RoleSelectUseCase();

  it("maps a BE enum to its appRole and the matching tenant role", () => {
    expect(uc.execute("TEACHER", roles)).toEqual({
      data: {
        appRole: "teacher",
        tenantId: "t1",
        tenantName: "THPT A",
        tenantCode: "A",
      },
    });
  });

  it("collapses ADMIN onto the principal appRole", () => {
    expect(uc.execute("ADMIN", roles)).toEqual({
      data: {
        appRole: "principal",
        tenantId: "t2",
        tenantName: "THPT B",
        tenantCode: undefined,
      },
    });
  });

  it("returns unauthorized when the enum is unknown", () => {
    expect(uc.execute("GHOST", roles)).toEqual({
      error: { type: "unauthorized" },
    });
  });

  it("returns unauthorized when the resolved role is not in the user's list", () => {
    expect(uc.execute("STUDENT", roles)).toEqual({
      error: { type: "unauthorized" },
    });
  });
});
