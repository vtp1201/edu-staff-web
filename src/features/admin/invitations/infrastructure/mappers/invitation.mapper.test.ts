import { describe, expect, it } from "vitest";
import type { Invitation as AuthInvitation } from "@/features/auth/domain/entities/invitation.entity";
import type { Invitation } from "../../domain/entities/invitation.entity";
import {
  applyInvitedByNames,
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

  it("toInvitation maps the auth-domain shape to the screen shape (wire `createdAt` → screen `sentAt`)", () => {
    const a: AuthInvitation = {
      invitationId: "inv-9",
      email: "bgh.tuan@email.com",
      roles: ["manager"],
      status: "accepted",
      invitedBy: "user-42",
      createdAt: "2026-07-01T00:00:00Z",
      expiresAt: "2026-07-15T00:00:00Z",
    };
    expect(toInvitation(a)).toEqual({
      id: "inv-9",
      email: "bgh.tuan@email.com",
      role: "manager",
      status: "accepted",
      // still the RAW id at this point — resolution happens in the repository
      invitedBy: "user-42",
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

  it("toInvitationFailure passes the 3 new wire failures through 1:1 (no collapsing)", () => {
    expect(toInvitationFailure({ type: "invitation-not-resendable" })).toEqual({
      type: "invitation-not-resendable",
    });
    expect(
      toInvitationFailure({ type: "rate-limited", retryAfterSeconds: 900 }),
    ).toEqual({ type: "rate-limited", retryAfterSeconds: 900 });
    expect(toInvitationFailure({ type: "rate-limited" })).toEqual({
      type: "rate-limited",
      retryAfterSeconds: undefined,
    });
    expect(toInvitationFailure({ type: "invalid-request" })).toEqual({
      type: "invalid-request",
    });
  });
});

describe("applyInvitedByNames (AC-3 display resolution)", () => {
  const row = (over: Partial<Invitation> = {}): Invitation => ({
    id: "inv-1",
    email: "a@x.com",
    role: "teacher",
    status: "pending",
    invitedBy: "user-1",
    sentAt: "2026-07-01T00:00:00Z",
    expiresAt: "2026-07-15T00:00:00Z",
    ...over,
  });

  it("replaces each raw invitedBy id with its resolved display name", () => {
    const out = applyInvitedByNames(
      [row(), row({ id: "inv-2", invitedBy: "user-2" })],
      new Map([
        ["user-1", "Trần Minh Quân"],
        ["user-2", "Nguyễn Thị Hương"],
      ]),
    );
    expect(out.map((r) => r.invitedBy)).toEqual([
      "Trần Minh Quân",
      "Nguyễn Thị Hương",
    ]);
  });

  it("blanks an UNRESOLVED id instead of leaking a raw UUID (presentation renders the i18n fallback)", () => {
    const out = applyInvitedByNames(
      [row({ invitedBy: "user-ghost" })],
      new Map(),
    );
    expect(out[0].invitedBy).toBe("");
  });

  it("leaves every other field untouched and does not mutate the input rows", () => {
    const input = [row()];
    const out = applyInvitedByNames(input, new Map([["user-1", "Quân"]]));
    expect(input[0].invitedBy).toBe("user-1");
    expect(out[0]).toEqual({ ...input[0], invitedBy: "Quân" });
  });
});
