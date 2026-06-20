import { describe, expect, it } from "vitest";
import { resolveStreamTenant } from "./stream-tenant";

// A minimal JWT with tenantId claim for testing
function makeFakeToken(tenantId: string | null): string {
  const payload = tenantId !== null ? { tenantId } : {};
  const encoded = btoa(JSON.stringify(payload));
  return `header.${encoded}.sig`;
}

describe("resolveStreamTenant", () => {
  it("returns ok with tenantId when token tenant matches requested", () => {
    const token = makeFakeToken("school-a");
    const result = resolveStreamTenant(token, "school-a", false);
    expect(result).toEqual({ ok: true, tenantId: "school-a" });
  });

  it("returns not ok when token tenant does not match requested", () => {
    const token = makeFakeToken("school-a");
    const result = resolveStreamTenant(token, "school-b", false);
    expect(result).toEqual({ ok: false });
  });

  it("returns not ok when token has no tenantId claim", () => {
    const token = makeFakeToken(null);
    const result = resolveStreamTenant(token, "school-a", false);
    expect(result).toEqual({ ok: false });
  });

  it("returns ok in mock mode regardless of tenant mismatch", () => {
    const token = makeFakeToken("school-a");
    const result = resolveStreamTenant(token, "school-b", true);
    expect(result).toEqual({ ok: true, tenantId: "school-b" });
  });

  it("returns ok in mock mode when token has no tenantId", () => {
    const token = makeFakeToken(null);
    const result = resolveStreamTenant(token, "any-tenant", true);
    expect(result).toEqual({ ok: true, tenantId: "any-tenant" });
  });
});
