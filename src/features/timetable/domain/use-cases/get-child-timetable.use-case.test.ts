import { describe, expect, it, vi } from "vitest";
import type { TimetableChild } from "../entities/timetable-child.entity";
import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { TimetableViewFailure } from "../failures/timetable-view.failure";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import { GetChildTimetableUseCase } from "./get-child-timetable.use-case";

const CHILDREN: TimetableChild[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    ordinal: 1,
    classId: "11A2",
    className: "11A2",
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
    name: "Nguyễn Thu Hà",
    ordinal: 2,
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
    getByMember: async (memberId) => ttFor(memberId),
    getMyTimetable: async () => ttFor("11A2"),
    getByTeacher: async () => ttFor("11A2"),
    getChildren: async () => CHILDREN,
    ...impl,
  };
}

describe("GetChildTimetableUseCase", () => {
  it("fetches the selected child BY MEMBER ID, never by classId (US-E18.26)", async () => {
    const getByMember = vi.fn(async (memberId: string) => ttFor(memberId));
    const getByClass = vi.fn(async (classId: string) => ttFor(classId));
    const useCase = new GetChildTimetableUseCase(
      repo({ getByMember, getByClass }),
    );

    const result = await useCase.execute("c1", "2026-08-03");

    expect(getByMember).toHaveBeenCalledWith("c1", "2026-08-03");
    expect(getByClass).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.classId).toBe("c1");
  });

  it("resolves the second child by their own memberId", async () => {
    const useCase = new GetChildTimetableUseCase(repo({}));
    const result = await useCase.execute("c2");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.classId).toBe("c2");
  });

  it("composes the roster's enriched className onto the by-member week (tech-lead review, US-E18.26)", async () => {
    // The by-member response has no top-level class identity, so the real repo
    // returns `className: ""`. The parent screen's caption/badge must still
    // show the class the roster already resolved via `linked-students`.
    const useCase = new GetChildTimetableUseCase(
      repo({
        getByMember: async () => ({
          classId: "c1",
          className: "",
          slots: {},
        }),
      }),
    );

    const result = await useCase.execute("c1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.className).toBe("11A2");
  });

  it("keeps the repository's className when the roster has no class context", async () => {
    const useCase = new GetChildTimetableUseCase(
      repo({
        getChildren: async () => [
          { childId: "c9", ordinal: 1, avatar: "1", color: "primary" },
        ],
        getByMember: async () => ({
          classId: "c9",
          className: "",
          slots: {},
        }),
      }),
    );

    const result = await useCase.execute("c9");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.className).toBe("");
  });

  it("still resolves a child whose classId is unknown (no current enrollment)", async () => {
    const useCase = new GetChildTimetableUseCase(
      repo({
        getChildren: async () => [
          { childId: "c9", ordinal: 1, avatar: "1", color: "primary" },
        ],
      }),
    );
    const result = await useCase.execute("c9");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.classId).toBe("c9");
  });

  it("returns no-child when the childId is not in the roster", async () => {
    const useCase = new GetChildTimetableUseCase(repo({}));
    const result = await useCase.execute("ghost");
    expect(result).toEqual({ ok: false, error: { type: "no-child" } });
  });

  it("propagates a thrown not-found failure from getByMember", async () => {
    const useCase = new GetChildTimetableUseCase(
      repo({
        getByMember: async () => {
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
        getByMember: async () => {
          throw new Error("boom");
        },
      }),
    );
    const result = await useCase.execute("c1");
    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});
