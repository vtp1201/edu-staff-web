import { describe, expect, it, vi } from "vitest";
import { MockClassSubjectsRepository } from "../../../infrastructure/repositories/mocks/class-subjects.mock.repository";
import { MOCK_CLASS_ID } from "../../../infrastructure/repositories/mocks/lms.fixtures";
import type { IClassSubjectsRepository } from "../../repositories/i-class-subjects.repository";
import { ListClassSubjectsUseCase } from "../list-class-subjects.use-case";

describe("ListClassSubjectsUseCase", () => {
  it("wraps the picker options in a Result", async () => {
    const listClassSubjects = vi.fn(async () => [
      { subjectId: "s1", subjectName: "Toán" },
    ]);
    const result = await new ListClassSubjectsUseCase({
      listClassSubjects,
    } as IClassSubjectsRepository).execute("cl-1");

    expect(listClassSubjects).toHaveBeenCalledWith("cl-1");
    expect(result).toEqual({
      ok: true,
      data: [{ subjectId: "s1", subjectName: "Toán" }],
    });
  });

  it("turns a denial into a failure, never an empty option list", async () => {
    const result = await new ListClassSubjectsUseCase({
      listClassSubjects: vi.fn(async () => {
        throw { type: "forbidden" as const };
      }),
    } as IClassSubjectsRepository).execute("cl-other");

    // An empty array here would render as "this class offers no subjects",
    // which is a different (and false) statement than "you may not read it".
    expect(result).toEqual({ ok: false, failure: { type: "forbidden" } });
  });
});

describe("MockClassSubjectsRepository", () => {
  it("offers subjects that have no course yet — the picker must reach them", async () => {
    const rows = await new MockClassSubjectsRepository().listClassSubjects(
      MOCK_CLASS_ID,
    );

    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map((r) => r.subjectId)).toContain("sub-sinh");
  });

  it("refuses an unknown class rather than answering an empty list", async () => {
    await expect(
      new MockClassSubjectsRepository().listClassSubjects("cl-nope"),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
