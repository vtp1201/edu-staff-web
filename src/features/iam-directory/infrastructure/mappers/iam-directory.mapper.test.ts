/**
 * Unit tests — IamDirectoryMapper (US-E18.23).
 */
import { describe, expect, it } from "vitest";
import { IamDirectoryMapper } from "./iam-directory.mapper";

describe("IamDirectoryMapper.toDirectoryMember", () => {
  it("keeps memberId === userId (a membership's identity IS (tenantId,userId) — no surrogate id)", () => {
    const entity = IamDirectoryMapper.toDirectoryMember({
      memberId: "u-7",
      userId: "u-7",
      displayName: "Phạm Văn D",
      email: "d@example.com",
      roles: ["TEACHER", "MANAGER"],
      status: "ACTIVE",
    });

    expect(entity.memberId).toBe(entity.userId);
    expect(entity).toEqual({
      memberId: "u-7",
      userId: "u-7",
      displayName: "Phạm Văn D",
      email: "d@example.com",
      roles: ["TEACHER", "MANAGER"],
      status: "ACTIVE",
    });
  });

  it("does NOT filter on status itself — BE owns the LEFT-exclusion rule", () => {
    // BE excludes LEFT members from the directory list but INCLUDES them in the
    // batch lookup (historical rows keep their names). That rule lives BE-side;
    // the mapper must pass through whatever arrives, or a future BE change
    // would be silently swallowed here.
    const suspended = IamDirectoryMapper.toDirectoryMember({
      memberId: "u-8",
      userId: "u-8",
      displayName: "Suspended One",
      email: "s@example.com",
      roles: ["STAFF"],
      status: "SUSPENDED",
    });

    expect(suspended.status).toBe("SUSPENDED");
  });
});

describe("IamDirectoryMapper.toMemberSummary", () => {
  it("maps the display-only batch row (no status/userId on the wire)", () => {
    expect(
      IamDirectoryMapper.toMemberSummary({
        memberId: "u-9",
        displayName: "Lê Văn C",
        email: "c@example.com",
        roles: ["PARENT"],
      }),
    ).toEqual({
      memberId: "u-9",
      displayName: "Lê Văn C",
      email: "c@example.com",
      roles: ["PARENT"],
    });
  });
});
