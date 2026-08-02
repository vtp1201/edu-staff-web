import { describe, expect, it } from "vitest";
import type { LinkedStudentsWithConsents } from "@/features/parent-links/domain/use-cases/get-linked-students-with-consents.use-case";
import {
  academicRecordHref,
  buildChildrenOverviewVM,
} from "./build-children-overview-vm";

const CONSENT = {
  parentId: "p-1",
  studentId: "st-1",
  disciplineAlerts: true,
  absenceAlerts: true,
  gradeAlerts: false,
};

const withConsents = (
  students: LinkedStudentsWithConsents["students"],
): LinkedStudentsWithConsents => ({
  students,
  consentByStudentId: { "st-1": CONSENT },
});

describe("buildChildrenOverviewVM", () => {
  it("selects only the identity fields of each linked student", () => {
    const result = buildChildrenOverviewVM({
      ok: true,
      value: withConsents([
        {
          studentId: "st-1",
          fullName: "Nguyễn Minh Khoa",
          avatarUrl: "https://cdn.example/avatar-1.png",
          linkId: "link-1",
        },
        { studentId: "st-2", fullName: "Nguyễn Minh Anh", linkId: "link-2" },
      ]),
    });

    expect(result).toEqual({
      success: true,
      children: [
        {
          studentId: "st-1",
          fullName: "Nguyễn Minh Khoa",
          avatarUrl: "https://cdn.example/avatar-1.png",
        },
        {
          studentId: "st-2",
          fullName: "Nguyễn Minh Anh",
          avatarUrl: undefined,
        },
      ],
    });
  });

  it("never leaks consent or linkId onto the card VM (AC-004)", () => {
    const result = buildChildrenOverviewVM({
      ok: true,
      value: withConsents([
        { studentId: "st-1", fullName: "Nguyễn Minh Khoa", linkId: "link-1" },
      ]),
    });

    if (!result.success) throw new Error("expected success");
    // Key-set assertion: `toMatchObject`/`toEqual` on a subset would not catch
    // an extra field leaking through the projection.
    expect(Object.keys(result.children[0]).sort()).toEqual([
      "avatarUrl",
      "fullName",
      "studentId",
    ]);
  });

  it("maps zero linked students to a genuine empty list (AC-002)", () => {
    const result = buildChildrenOverviewVM({
      ok: true,
      value: { students: [], consentByStudentId: {} },
    });

    expect(result).toEqual({ success: true, children: [] });
  });

  it("maps a forbidden failure to its own errorKey — never a fake empty", () => {
    const result = buildChildrenOverviewVM({
      ok: false,
      failure: { type: "forbidden" },
    });

    expect(result).toEqual({ success: false, errorKey: "forbidden" });
  });

  it.each([
    { type: "network-error" as const },
    { type: "validation" as const, fields: [] },
  ])("maps %o to network-error", (failure) => {
    expect(buildChildrenOverviewVM({ ok: false, failure })).toEqual({
      success: false,
      errorKey: "network-error",
    });
  });
});

describe("academicRecordHref", () => {
  it("builds the existing child academic-record route under the tenant base", () => {
    expect(academicRecordHref("/t/acme/parent/children", "st-1")).toBe(
      "/t/acme/parent/children/st-1/academic-record",
    );
  });

  it("encodes a student id that is not URL-safe", () => {
    expect(academicRecordHref("/t/acme/parent/children", "st 1/2")).toBe(
      "/t/acme/parent/children/st%201%2F2/academic-record",
    );
  });
});
