import { describe, expect, it } from "vitest";
import type { TimetableChild } from "../entities/timetable-child.entity";
import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { TimetableViewFailure } from "../failures/timetable-view.failure";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import { GetMyTeachingScheduleUseCase } from "./get-my-teaching-schedule.use-case";

// Teacher-scope reuse of the class-shaped entity: top-level classId/className
// hold the teacher's id/name; slots carry a per-slot className (the class taught).
const TT: WeeklyTimetable = {
  classId: "t1",
  className: "Cô Nguyễn Thị Hương",
  slots: {
    0: {
      1: {
        subjectId: "math",
        subjectName: "Toán",
        subjectColorToken: "primary",
        room: "P.302",
        className: "11A2",
      },
    },
  },
};

function repo(
  impl: Partial<IWeeklyTimetableRepository>,
): IWeeklyTimetableRepository {
  return {
    getByClass: async () => TT,
    getMyTimetable: async () => TT,
    getByTeacher: async () => TT,
    getChildren: async () => [] as TimetableChild[],
    ...impl,
  };
}

describe("GetMyTeachingScheduleUseCase", () => {
  it("returns the signed-in teacher's weekly teaching schedule (across classes)", async () => {
    const useCase = new GetMyTeachingScheduleUseCase(repo({}));
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slots[0][1]?.subjectName).toBe("Toán");
      // teacher variant carries the class taught on the slot
      expect(result.data.slots[0][1]?.className).toBe("11A2");
    }
  });

  it("maps a thrown not-found failure to { ok: false, error }", async () => {
    const useCase = new GetMyTeachingScheduleUseCase(
      repo({
        getByTeacher: async () => {
          throw { type: "not-found" } satisfies TimetableViewFailure;
        },
      }),
    );
    const result = await useCase.execute();
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("maps a non-typed throw to a network-error failure", async () => {
    const useCase = new GetMyTeachingScheduleUseCase(
      repo({
        getByTeacher: async () => {
          throw new Error("boom");
        },
      }),
    );
    const result = await useCase.execute();
    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});
