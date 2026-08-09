import { describe, expect, it } from "vitest";
import { dedupeGradeSubjects } from "./resolve-my-grade-subjects";

const opt = (classId: string, subjectId: string) => ({
  classId,
  subjectId,
  className: classId,
  subjectName: subjectId,
});

describe("dedupeGradeSubjects", () => {
  it("keeps one option per (classId, subjectId) — the picker's React key", () => {
    const out = dedupeGradeSubjects([
      opt("c-1", "s-1"),
      opt("c-1", "s-1"),
      opt("c-1", "s-2"),
    ]);
    expect(out.map((o) => `${o.classId}:${o.subjectId}`)).toEqual([
      "c-1:s-1",
      "c-1:s-2",
    ]);
  });

  it("keeps the same subject taught in two classes — different keys", () => {
    expect(
      dedupeGradeSubjects([opt("c-1", "s-1"), opt("c-2", "s-1")]),
    ).toHaveLength(2);
  });

  it("keeps the first occurrence's display fields", () => {
    const [first] = dedupeGradeSubjects([
      { ...opt("c-1", "s-1"), className: "10A1" },
      { ...opt("c-1", "s-1"), className: "WRONG" },
    ]);
    expect(first.className).toBe("10A1");
  });
});
