import { describe, expect, it, vi } from "vitest";
import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { TimetableViewFailure } from "../failures/timetable-view.failure";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import { GetMemberTimetableUseCase } from "./get-member-timetable.use-case";

function ttFor(id: string): WeeklyTimetable {
  return { classId: id, className: id, slots: {} };
}

function repo(
  impl: Partial<IWeeklyTimetableRepository>,
): IWeeklyTimetableRepository {
  return {
    getByClass: async (classId) => ttFor(classId),
    getByMember: async (memberId) => ttFor(memberId),
    getMyTimetable: async () => ttFor("11A2"),
    getByTeacher: async () => ttFor("11A2"),
    getChildren: async () => [],
    ...impl,
  };
}

describe("GetMemberTimetableUseCase", () => {
  it("fetches BY MEMBER ID and passes weekStart through", async () => {
    const getByMember = vi.fn(async (memberId: string) => ttFor(memberId));
    const getByClass = vi.fn(async (classId: string) => ttFor(classId));
    const getChildren = vi.fn(async () => []);
    const useCase = new GetMemberTimetableUseCase(
      repo({ getByMember, getByClass, getChildren }),
    );

    const result = await useCase.execute("t-1", "2026-08-03");

    expect(getByMember).toHaveBeenCalledWith("t-1", "2026-08-03");
    expect(getByClass).not.toHaveBeenCalled();
    // Thin wrapper: no roster validation (the picker's list IS the fetch source).
    expect(getChildren).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: ttFor("t-1") });
  });

  it("returns the repository's week UNTOUCHED (no className composition)", async () => {
    // Unlike the parent's use-case, nothing is composed on: a teacher's week
    // spans many classes, so there is no single class identity to enrich with.
    const week: WeeklyTimetable = { classId: "t-2", className: "", slots: {} };
    const useCase = new GetMemberTimetableUseCase(
      repo({ getByMember: async () => week }),
    );

    const result = await useCase.execute("t-2");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(week);
  });

  it("propagates a thrown typed not-found failure unchanged", async () => {
    const useCase = new GetMemberTimetableUseCase(
      repo({
        getByMember: async () => {
          throw { type: "not-found" } satisfies TimetableViewFailure;
        },
      }),
    );

    expect(await useCase.execute("t-1")).toEqual({
      ok: false,
      error: { type: "not-found" },
    });
  });

  it("maps a non-typed throw to a network-error failure", async () => {
    const useCase = new GetMemberTimetableUseCase(
      repo({
        getByMember: async () => {
          throw new Error("boom");
        },
      }),
    );

    expect(await useCase.execute("t-1")).toEqual({
      ok: false,
      error: { type: "network-error" },
    });
  });
});
