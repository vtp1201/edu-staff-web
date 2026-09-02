/**
 * `ListCoursesWithSummaryUseCase` (US-E24.2) — the N+1 fan-out behind the
 * course cards: one `listCourses` + one `listItems` PER course, because `lms`
 * publishes no rollup endpoint (ask #4).
 *
 * The behaviour under test that no other layer can prove: a single course's
 * timeline read failing must degrade THAT card only. The whole-page error path
 * is reserved for `listCourses` itself failing.
 */
import { describe, expect, it, vi } from "vitest";
import type { CourseSummary } from "../../entities/course.entity";
import type { CourseItem } from "../../entities/course-item.entity";
import type { LmsFailure } from "../../failures/lms.failure";
import type { ILmsRepository } from "../../repositories/i-lms.repository";
import { ListCoursesWithSummaryUseCase } from "../list-courses-with-summary.use-case";

const NOW = new Date("2026-09-02T08:00:00Z");

function course(id: string): CourseSummary {
  return {
    id,
    classId: "cl1",
    subjectId: `s-${id}`,
    title: `Course ${id}`,
    status: "PUBLISHED",
    isDefault: true,
    createdBy: "t1",
    updatedAt: "2026-09-01T00:00:00Z",
    publishedAt: "2026-09-01T00:00:00Z",
  };
}

function openItem(courseId: string, dueAt: string | null): CourseItem {
  return {
    id: `${courseId}-i1`,
    courseId,
    itemType: "ASSIGNMENT",
    refId: `${courseId}-i1`,
    title: `Item of ${courseId}`,
    description: null,
    url: null,
    position: 0,
    startAt: null,
    dueAt,
    state: "OPEN",
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    exam: null,
  };
}

function makeRepo(over: Partial<ILmsRepository>): ILmsRepository {
  return over as ILmsRepository;
}

describe("ListCoursesWithSummaryUseCase", () => {
  it("returns the course-list failure verbatim (whole-page error), never fanning out", async () => {
    const failure: LmsFailure = { type: "forbidden" };
    const listItems = vi.fn();
    const useCase = new ListCoursesWithSummaryUseCase(
      makeRepo({
        listCourses: vi.fn().mockRejectedValue(failure),
        listItems,
      }),
    );

    const result = await useCase.execute("cl1", NOW);

    expect(result).toEqual({ ok: false, failure });
    expect(listItems).not.toHaveBeenCalled();
  });

  it("summarizes every course, one timeline read each, in the list's order", async () => {
    const listItems = vi.fn(async (courseId: string) =>
      courseId === "c1"
        ? [openItem("c1", "2026-09-05T08:00:00Z"), openItem("c1", null)]
        : [],
    );
    const useCase = new ListCoursesWithSummaryUseCase(
      makeRepo({
        listCourses: vi.fn().mockResolvedValue([course("c1"), course("c2")]),
        listItems,
      }),
    );

    const result = await useCase.execute("cl1", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(listItems).toHaveBeenCalledTimes(2);
    expect(result.data.map((row) => row.course.id)).toEqual(["c1", "c2"]);
    expect(result.data[0]).toMatchObject({ itemsFailed: false });
    expect(result.data[0]?.summary?.openCount).toBe(2);
    expect(result.data[0]?.summary?.nextDue?.dueAt).toBe(
      "2026-09-05T08:00:00Z",
    );
    // A course with no items is a normal card, not a failed one.
    expect(result.data[1]).toMatchObject({
      itemsFailed: false,
      summary: { openCount: 0, nextDue: null },
    });
  });

  it("degrades ONLY the course whose timeline read failed", async () => {
    const useCase = new ListCoursesWithSummaryUseCase(
      makeRepo({
        listCourses: vi
          .fn()
          .mockResolvedValue([course("c1"), course("c2"), course("c3")]),
        listItems: vi.fn(async (courseId: string) => {
          if (courseId === "c2") throw { type: "not-found" } as LmsFailure;
          return [openItem(courseId, null)];
        }),
      }),
    );

    const result = await useCase.execute("cl1", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[1]).toMatchObject({
      itemsFailed: true,
      summary: null,
    });
    expect(result.data[0]).toMatchObject({ itemsFailed: false });
    expect(result.data[2]).toMatchObject({ itemsFailed: false });
    expect(result.data[0]?.summary?.openCount).toBe(1);
  });

  it("handles a class with zero courses without touching the timeline endpoint", async () => {
    const listItems = vi.fn();
    const useCase = new ListCoursesWithSummaryUseCase(
      makeRepo({
        listCourses: vi.fn().mockResolvedValue([]),
        listItems,
      }),
    );

    const result = await useCase.execute("cl1", NOW);

    expect(result).toEqual({ ok: true, data: [] });
    expect(listItems).not.toHaveBeenCalled();
  });

  it("forwards the optional subject filter to the course list", async () => {
    const listCourses = vi.fn().mockResolvedValue([]);
    const useCase = new ListCoursesWithSummaryUseCase(
      makeRepo({ listCourses, listItems: vi.fn() }),
    );

    await useCase.execute("cl1", NOW, "s-math");

    expect(listCourses).toHaveBeenCalledWith("cl1", "s-math");
  });
});
