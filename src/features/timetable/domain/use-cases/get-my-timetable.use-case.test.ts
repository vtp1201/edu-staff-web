import { describe, expect, it } from "vitest";
import type { TimetableChild } from "../entities/timetable-child.entity";
import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { TimetableViewFailure } from "../failures/timetable-view.failure";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import { GetMyTimetableUseCase } from "./get-my-timetable.use-case";

const TT: WeeklyTimetable = {
  classId: "11A2",
  className: "11A2",
  slots: {
    0: {
      1: {
        subjectId: "math",
        subjectName: "Toán",
        subjectColorToken: "primary",
        teacherName: "Cô Nguyễn Thị Hương",
        room: "P.302",
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
    getChildren: async () => [] as TimetableChild[],
    ...impl,
  };
}

describe("GetMyTimetableUseCase", () => {
  it("returns the student's own weekly timetable (11A2 full week)", async () => {
    const useCase = new GetMyTimetableUseCase(repo({}));
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.classId).toBe("11A2");
      expect(result.data.slots[0][1]?.subjectName).toBe("Toán");
    }
  });

  it("maps a thrown not-found failure to { ok: false, error }", async () => {
    const useCase = new GetMyTimetableUseCase(
      repo({
        getMyTimetable: async () => {
          throw { type: "not-found" } satisfies TimetableViewFailure;
        },
      }),
    );
    const result = await useCase.execute();
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("maps a non-typed throw to a network-error failure", async () => {
    const useCase = new GetMyTimetableUseCase(
      repo({
        getMyTimetable: async () => {
          throw new Error("boom");
        },
      }),
    );
    const result = await useCase.execute();
    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});
