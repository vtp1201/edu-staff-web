import { describe, expect, it } from "vitest";
import type { Invitation as AuthInvitation } from "@/features/auth/domain/entities/invitation.entity";
import {
  fromWireStatus,
  toInvitation,
  toInvitationFailure,
  toInvitationRole,
  toWireRole,
} from "./invitation.mapper";

describe("invitation.mapper", () => {
  it("toWireRole uppercases 1:1 with no alias (manager→MANAGER, admin→ADMIN)", () => {
    expect(toWireRole("teacher")).toBe("TEACHER");
    expect(toWireRole("student")).toBe("STUDENT");
    expect(toWireRole("parent")).toBe("PARENT");
    expect(toWireRole("manager")).toBe("MANAGER");
    expect(toWireRole("admin")).toBe("ADMIN");
  });

  it("toInvitationRole lowercases known roles and defaults unknown to teacher", () => {
    expect(toInvitationRole("MANAGER")).toBe("manager");
    expect(toInvitationRole("admin")).toBe("admin");
    expect(toInvitationRole("STAFF")).toBe("teacher"); // no badge → fallback
  });

  it("fromWireStatus lowercases UPPERCASE wire status", () => {
    expect(fromWireStatus("PENDING")).toBe("pending");
    expect(fromWireStatus("revoked")).toBe("revoked");
    expect(fromWireStatus("weird")).toBe("pending");
  });

  it("toInvitation maps the auth-domain shape to the screen shape", () => {
    const a: AuthInvitation = {
      invitationId: "inv-9",
      tenantId: "tenant-acme",
      email: "bgh.tuan@email.com",
      roles: ["manager"],
      status: "accepted",
      invitedBy: "Trần Minh Quân",
      sentAt: "2026-07-01T00:00:00Z",
      expiresAt: "2026-07-15T00:00:00Z",
    };
    expect(toInvitation(a)).toEqual({
      id: "inv-9",
      email: "bgh.tuan@email.com",
      role: "manager",
      status: "accepted",
      invitedBy: "Trần Minh Quân",
      sentAt: "2026-07-01T00:00:00Z",
      expiresAt: "2026-07-15T00:00:00Z",
    });
  });

  it("toInvitationFailure preserves invitation-invalid and maps network/others", () => {
    expect(toInvitationFailure({ type: "invitation-invalid" })).toEqual({
      type: "invitation-invalid",
    });
    expect(toInvitationFailure({ type: "invitation-expired" })).toEqual({
      type: "invitation-invalid",
    });
    expect(toInvitationFailure({ type: "member-exists" })).toEqual({
      type: "invitation-invalid",
    });
    expect(toInvitationFailure({ type: "network-error" })).toEqual({
      type: "network-error",
    });
    expect(toInvitationFailure({ type: "forbidden" })).toEqual({
      type: "unknown",
    });
    expect(toInvitationFailure(new Error("boom"))).toEqual({ type: "unknown" });
  });
});
