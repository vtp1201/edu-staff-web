import { describe, expect, it } from "vitest";
import type { TimetableChild } from "../entities/timetable-child.entity";
import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import { GetChildListUseCase } from "./get-child-list.use-case";

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

function repo(
  impl: Partial<IWeeklyTimetableRepository>,
): IWeeklyTimetableRepository {
  return {
    getByClass: async () => ({}) as WeeklyTimetable,
    getMyTimetable: async () => ({}) as WeeklyTimetable,
    getByTeacher: async () => ({}) as WeeklyTimetable,
    getChildren: async () => CHILDREN,
    ...impl,
  };
}

describe("GetChildListUseCase", () => {
  it("returns the parent's fixed 2-child roster (11A2 + 8B1)", async () => {
    const useCase = new GetChildListUseCase(repo({}));
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].className).toBe("11A2");
      expect(result.data[1].className).toBe("8B1");
    }
  });

  it("maps a thrown error to a network-error failure", async () => {
    const useCase = new GetChildListUseCase(
      repo({
        getChildren: async () => {
          throw new Error("boom");
        },
      }),
    );
    const result = await useCase.execute();
    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});
