import { describe, expect, it } from "vitest";
import type { TimetableChild } from "../entities/timetable-child.entity";
import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { TimetableViewFailure } from "../failures/timetable-view.failure";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import { GetChildTimetableUseCase } from "./get-child-timetable.use-case";

const CHILDREN: TimetableChild[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    classId: "11A2",
    className: "11A2",
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
    name: "Nguyễn Thu Hà",
    classId: "8B1",
    className: "8B1",
    avatar: "NH",
    color: "success",
  },
];

function ttFor(classId: string): WeeklyTimetable {
  return { classId, className: classId, slots: {} };
}

function repo(
  impl: Partial<IWeeklyTimetableRepository>,
): IWeeklyTimetableRepository {
  return {
    getByClass: async (classId) => ttFor(classId),
    getMyTimetable: async () => ttFor("11A2"),
    getByTeacher: async () => ttFor("11A2"),
    getChildren: async () => CHILDREN,
    ...impl,
  };
}

describe("GetChildTimetableUseCase", () => {
  it("resolves the first child's class and fetches its timetable", async () => {
    const useCase = new GetChildTimetableUseCase(repo({}));
    const result = await useCase.execute("c1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.classId).toBe("11A2");
  });

  it("resolves the second child's class (8B1)", async () => {
    const useCase = new GetChildTimetableUseCase(repo({}));
    const result = await useCase.execute("c2");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.classId).toBe("8B1");
  });

  it("returns no-child when the childId is not in the roster", async () => {
    const useCase = new GetChildTimetableUseCase(repo({}));
    const result = await useCase.execute("ghost");
    expect(result).toEqual({ ok: false, error: { type: "no-child" } });
  });

  it("propagates a thrown not-found failure from getByClass", async () => {
    const useCase = new GetChildTimetableUseCase(
      repo({
        getByClass: async () => {
          throw { type: "not-found" } satisfies TimetableViewFailure;
        },
      }),
    );
    const result = await useCase.execute("c1");
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("maps a non-typed throw to a network-error failure", async () => {
    const useCase = new GetChildTimetableUseCase(
      repo({
        getByClass: async () => {
          throw new Error("boom");
        },
      }),
    );
    const result = await useCase.execute("c1");
    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});
