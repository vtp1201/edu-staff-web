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

  it("staff tier — the full row is byte-identical to the pre-ADR-0129 shape (regression, US-E18.52)", () => {
    // The SAME mapper now serves both tiers. A staff-tier caller
    // (SUPER_ADMIN / tenant ADMIN|MANAGER|TEACHER) must keep receiving all six
    // keys, unchanged — every existing consumer (class picker, staffing, admin
    // roster, principal teacher directory) depends on it.
    const entity = IamDirectoryMapper.toDirectoryMember({
      memberId: "u-20",
      userId: "u-20",
      displayName: "Nguyễn Thị Staff",
      email: "staff@example.com",
      roles: ["TEACHER"],
      status: "ACTIVE",
    });

    expect(Object.keys(entity).sort()).toEqual([
      "displayName",
      "email",
      "memberId",
      "roles",
      "status",
      "userId",
    ]);
    expect(entity).toEqual({
      memberId: "u-20",
      userId: "u-20",
      displayName: "Nguyễn Thị Staff",
      email: "staff@example.com",
      roles: ["TEACHER"],
      status: "ACTIVE",
    });
  });

  it("narrowed tier (STAFF/STUDENT/PARENT caller) — email/roles/status keys are ABSENT, not undefined-valued (ADR 0129)", () => {
    // Same tiered-response idiom as `MemberSummary` (ADR-0120) and `dob`/
    // `gender` (ADR-0122): presence IS the tier signal, so a conditional
    // spread — never `?? ""` — is the only honest map. `toEqual` alone would
    // pass with an `email: undefined` key present, hence the key-set + `in`
    // assertions.
    const entity = IamDirectoryMapper.toDirectoryMember({
      memberId: "u-21",
      userId: "u-21",
      displayName: "Lê Văn Giáo",
    });

    expect(Object.keys(entity).sort()).toEqual([
      "displayName",
      "memberId",
      "userId",
    ]);
    expect("email" in entity).toBe(false);
    expect("roles" in entity).toBe(false);
    expect("status" in entity).toBe(false);
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
  it("staff tier — maps the full row (no status/userId on the wire)", () => {
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

  it("narrowed tier (PARENT/STUDENT/STAFF caller) — email/roles keys are ABSENT, not undefined-valued (ADR-0120)", () => {
    // Field ABSENCE is the tier signal: a narrowed-tier row must not gain
    // `email: undefined` / `roles: undefined` keys on the way in, or
    // `"email" in summary` would wrongly report a staff-tier response.
    const summary = IamDirectoryMapper.toMemberSummary({
      memberId: "u-10",
      displayName: "Trần Bảo An",
    });

    expect(summary).toEqual({ memberId: "u-10", displayName: "Trần Bảo An" });
    expect(Object.keys(summary).sort()).toEqual(["displayName", "memberId"]);
    expect("email" in summary).toBe(false);
    expect("roles" in summary).toBe(false);
  });

  it("narrowed tier — a consumer reading only displayName is unaffected", () => {
    const summary = IamDirectoryMapper.toMemberSummary({
      memberId: "u-11",
      displayName: "Võ Thị Bình",
    });
    expect(summary.displayName).toBe("Võ Thị Bình");
  });

  it("staff tier — carries dob/gender when the member HAS them (IAM US-169, ADR-0122)", () => {
    const summary = IamDirectoryMapper.toMemberSummary({
      memberId: "u-12",
      displayName: "Nguyễn Minh Anh",
      email: "anh@example.com",
      roles: ["STUDENT"],
      dob: "2010-03-15T00:00:00Z",
      gender: "FEMALE",
    });

    expect(summary.dob).toBe("2010-03-15T00:00:00Z");
    expect(summary.gender).toBe("FEMALE");
  });

  it("staff tier + PII UNSET — dob/gender keys are ABSENT, not undefined-valued (ADR-0122: optional PER USER)", () => {
    // `dob`/`gender` are omitted for a staff-tier caller too when the member
    // never set them. Absence here means "chưa cập nhật" (a legitimate state),
    // NOT "narrowed tier" — `email`/`roles` remain the tier signal.
    const summary = IamDirectoryMapper.toMemberSummary({
      memberId: "u-13",
      displayName: "Trần Văn Bình",
      email: "binh@example.com",
      roles: ["STUDENT"],
    });

    expect(Object.keys(summary).sort()).toEqual([
      "displayName",
      "email",
      "memberId",
      "roles",
    ]);
    expect("dob" in summary).toBe(false);
    expect("gender" in summary).toBe(false);
  });

  it("narrowed tier — dob/gender are absent alongside email/roles (PII never reaches a non-staff caller)", () => {
    const summary = IamDirectoryMapper.toMemberSummary({
      memberId: "u-14",
      displayName: "Lê Thị Cẩm",
    });

    expect(Object.keys(summary).sort()).toEqual(["displayName", "memberId"]);
  });
});
