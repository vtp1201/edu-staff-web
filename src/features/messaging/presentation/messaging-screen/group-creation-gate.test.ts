import { describe, expect, it } from "vitest";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import { canCreateGroupFor, createGroupErrorKey } from "./group-creation-gate";

describe("createGroupErrorKey", () => {
  it("keeps the forbidden key distinct so the banner can say 'not permitted'", () => {
    expect(createGroupErrorKey(new Error("create-group-forbidden"))).toBe(
      "create-group-forbidden",
    );
  });

  it("falls back to the generic retryable key for any other failure", () => {
    expect(createGroupErrorKey(new Error("create-group-failed"))).toBe(
      "create-group-failed",
    );
    expect(createGroupErrorKey(new Error("something-unmapped"))).toBe(
      "create-group-failed",
    );
    expect(createGroupErrorKey("not an Error")).toBe("create-group-failed");
  });

  it("returns undefined when there is no error (no banner)", () => {
    expect(createGroupErrorKey(null)).toBeUndefined();
    expect(createGroupErrorKey(undefined)).toBeUndefined();
  });
});

describe("canCreateGroupFor (US-E18.50 — BE US-193 role allow-list)", () => {
  // BE allow-list is ADMIN/MANAGER/TEACHER/STAFF; `role-meta.ts` collapses
  // ADMIN+MANAGER → "principal" and TEACHER+STAFF → "teacher", so every
  // staff-tier appRole is allowed.
  it.each<UserRole>([
    "teacher",
    "principal",
    "admin",
  ])("allows the staff-tier appRole %s", (role) => {
    expect(canCreateGroupFor(role)).toBe(true);
  });

  it.each<UserRole>([
    "student",
    "parent",
  ])("denies %s — the server would answer 403 SOCIAL_GROUP_ROOM_CREATION_FORBIDDEN", (role) => {
    expect(canCreateGroupFor(role)).toBe(false);
  });

  it("fails closed for an unreadable/absent role claim", () => {
    expect(canCreateGroupFor(null)).toBe(false);
  });
});
