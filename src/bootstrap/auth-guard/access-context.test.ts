import { describe, expect, it } from "vitest";
import { evaluateAccess } from "./access-context";

describe("evaluateAccess", () => {
  it("returns 'unauthenticated' when role is null", () => {
    const result = evaluateAccess({
      role: null,
      tokenTenantId: "t1",
      urlTenantId: "t1",
    });
    expect(result).toBe("unauthenticated");
  });

  it("returns 'tenant-mismatch' when tokenTenantId is null", () => {
    const result = evaluateAccess({
      role: "teacher",
      tokenTenantId: null,
      urlTenantId: "t1",
    });
    expect(result).toBe("tenant-mismatch");
  });

  it("returns 'tenant-mismatch' when tokenTenantId !== urlTenantId", () => {
    const result = evaluateAccess({
      role: "teacher",
      tokenTenantId: "t2",
      urlTenantId: "t1",
    });
    expect(result).toBe("tenant-mismatch");
  });

  it("returns 'allowed' when role matches tenant and no requiredRoles", () => {
    const result = evaluateAccess({
      role: "teacher",
      tokenTenantId: "t1",
      urlTenantId: "t1",
    });
    expect(result).toBe("allowed");
  });

  it("returns 'allowed' when role in requiredRoles", () => {
    const result = evaluateAccess({
      role: "admin",
      tokenTenantId: "t1",
      urlTenantId: "t1",
      requiredRoles: ["admin"],
    });
    expect(result).toBe("allowed");
  });

  it("returns 'forbidden-role' when role not in requiredRoles", () => {
    const result = evaluateAccess({
      role: "teacher",
      tokenTenantId: "t1",
      urlTenantId: "t1",
      requiredRoles: ["admin"],
    });
    expect(result).toBe("forbidden-role");
  });

  it("returns 'allowed' for any role when requiredRoles is omitted and tenant matches", () => {
    const result = evaluateAccess({
      role: "student",
      tokenTenantId: "school-a",
      urlTenantId: "school-a",
    });
    expect(result).toBe("allowed");
  });
});
