import { describe, expect, it } from "vitest";
import type {
  InvitationListItemResponseDto,
  MembershipSummaryDto,
} from "../dtos/iam-member-response.dto";
import {
  mapInvitationListItem,
  mapMembershipSummary,
} from "./iam-member.mapper";

describe("mapMembershipSummary", () => {
  it("maps the real MembershipSummary wire shape 1:1 (no tenantName on the wire, US-E18.6)", () => {
    const dto: MembershipSummaryDto = {
      tenantId: "t-1",
      roles: ["ADMIN", "TEACHER"],
      status: "ACTIVE",
    };
    expect(mapMembershipSummary(dto)).toEqual({
      tenantId: "t-1",
      roles: ["ADMIN", "TEACHER"],
      status: "ACTIVE",
    });
  });

  it("passes through a non-ACTIVE status verbatim", () => {
    const dto: MembershipSummaryDto = {
      tenantId: "t-2",
      roles: ["PARENT"],
      status: "SUSPENDED",
    };
    expect(mapMembershipSummary(dto).status).toBe("SUSPENDED");
  });
});

describe("mapInvitationListItem (IAM US-147, US-E18.29)", () => {
  const dto: InvitationListItemResponseDto = {
    invitationId: "inv-7",
    email: "system.admin@email.com",
    roles: ["ADMIN", "TEACHER"],
    status: "pending",
    invitedBy: "user-42",
    createdAt: "2026-07-20T01:00:00Z",
    expiresAt: "2026-07-23T01:00:00Z",
  };

  it("folds the UPPERCASE wire roles to lowercase and keeps every other field 1:1", () => {
    expect(mapInvitationListItem(dto)).toEqual({
      invitationId: "inv-7",
      email: "system.admin@email.com",
      roles: ["admin", "teacher"],
      status: "pending",
      invitedBy: "user-42",
      createdAt: "2026-07-20T01:00:00Z",
      expiresAt: "2026-07-23T01:00:00Z",
    });
  });

  it("produces EXACTLY the entity's key set (no wire field leaks, no invented field)", () => {
    expect(Object.keys(mapInvitationListItem(dto)).sort()).toEqual([
      "createdAt",
      "email",
      "expiresAt",
      "invitationId",
      "invitedBy",
      "roles",
      "status",
    ]);
  });

  it("narrows the 4 projected statuses and falls back to revoked for an unknown value", () => {
    for (const s of ["pending", "accepted", "expired", "revoked"] as const) {
      expect(mapInvitationListItem({ ...dto, status: s }).status).toBe(s);
    }
    // Defensive: a future BE enum value must not widen the union at runtime —
    // and must not land on `pending` either, which is an ACTIONABLE status
    // (enables resend/copy-link/revoke affordances on the row). `revoked` is
    // terminal and action-free, so an unrecognised value stays inert.
    expect(mapInvitationListItem({ ...dto, status: "SOMETHING" }).status).toBe(
      "revoked",
    );
  });
});
