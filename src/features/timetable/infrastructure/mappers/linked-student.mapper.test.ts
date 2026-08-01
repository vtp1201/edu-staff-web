import { describe, expect, it } from "vitest";
import type { LinkedStudentItemDto } from "../dtos/linked-student-item.dto";
import { toTimetableChildren } from "./linked-student.mapper";

function link(
  linkId: string,
  studentMemberId: string,
  extra: Partial<LinkedStudentItemDto> = {},
): LinkedStudentItemDto {
  return {
    linkId,
    parentMemberId: "p-1",
    studentMemberId,
    createdAt: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

describe("toTimetableChildren", () => {
  it("assigns 1-based ordinals from a linkId-ascending sort, not response order", () => {
    const children = toTimetableChildren([
      link("link-b", "stu-b"),
      link("link-a", "stu-a"),
    ]);

    expect(children.map((c) => [c.childId, c.ordinal])).toEqual([
      ["stu-a", 1],
      ["stu-b", 2],
    ]);
  });

  it("is stable: a reshuffled response yields identical ordinals/colors", () => {
    const dtos = [link("l3", "s3"), link("l1", "s1"), link("l2", "s2")];
    const first = toTimetableChildren(dtos);
    const second = toTimetableChildren([...dtos].reverse());
    expect(second).toEqual(first);
  });

  it("never invents a display name (ask #20 residual) and falls the avatar back to the ordinal digit", () => {
    const [child] = toTimetableChildren([link("l1", "s1")]);
    expect(child?.name).toBeUndefined();
    expect(child?.avatar).toBe("1");
  });

  it("maps an enriched class context through", () => {
    const [child] = toTimetableChildren([
      link("l1", "s1", { classId: "cls-1", className: "10A1" }),
    ]);
    expect(child?.classId).toBe("cls-1");
    expect(child?.className).toBe("10A1");
  });

  it("treats an absent and an explicitly-null class context as equivalent (US-148 D5)", () => {
    const [absent] = toTimetableChildren([link("l1", "s1")]);
    const [nulled] = toTimetableChildren([
      link("l1", "s1", { classId: null, className: null }),
    ]);
    expect(absent?.classId).toBeUndefined();
    expect(absent?.className).toBeUndefined();
    expect(nulled).toEqual(absent);
  });

  it("cycles the color palette deterministically and wraps past its length", () => {
    const children = toTimetableChildren(
      Array.from({ length: 7 }, (_, i) => link(`l${i}`, `s${i}`)),
    );
    expect(children.map((c) => c.color)).toEqual([
      "primary",
      "success",
      "warning",
      "error",
      "purple",
      "teal",
      "primary",
    ]);
  });
});
