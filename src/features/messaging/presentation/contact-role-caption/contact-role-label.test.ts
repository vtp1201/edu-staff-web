/**
 * Unit tests — contact role caption resolution (US-E18.52).
 *
 * A contact row can arrive from two sources with different role information:
 * the seeded mock (free-text `role`) and the REAL IAM directory (a stable
 * `roleKey`, because the narrowed-tier wire row carries no role text at all).
 */
import { describe, expect, it } from "vitest";
import { contactRoleCaption } from "./contact-role-label";

describe("contactRoleCaption", () => {
  it("prefers the stable roleKey (real directory contact) — presentation translates it", () => {
    expect(contactRoleCaption({ roleKey: "teacher" })).toEqual({
      kind: "key",
      roleKey: "teacher",
    });
  });

  it("falls back to the seeded free-text role (mock contact)", () => {
    expect(contactRoleCaption({ role: "Giáo viên Văn" })).toEqual({
      kind: "text",
      text: "Giáo viên Văn",
    });
  });

  it("prefers roleKey over stale free text when both are present", () => {
    expect(
      contactRoleCaption({ roleKey: "admin", role: "Giáo viên Văn" }),
    ).toEqual({ kind: "key", roleKey: "admin" });
  });

  it("returns null when there is nothing honest to show — the caller OMITS the line", () => {
    // A narrowed-tier row with no pinned role would otherwise render an empty
    // caption that reads as "data missing" rather than "no such data".
    expect(contactRoleCaption({})).toBeNull();
    expect(contactRoleCaption({ role: "" })).toBeNull();
    expect(contactRoleCaption({ role: "   " })).toBeNull();
  });
});
