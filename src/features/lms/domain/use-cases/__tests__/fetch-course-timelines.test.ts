/**
 * `fetchCourseTimelines` (US-E24.4) — the N+1 fan-out `lms` forces on us,
 * extracted from `ListCoursesWithSummaryUseCase` so BOTH student course views
 * (the card grid of US-E24.2 and the cross-subject filter of US-E24.4) read
 * the class's timelines through ONE implementation.
 *
 * The behaviour that only lives here: `listCourses` failing propagates (there
 * is no page without the list), while ONE course's `listItems` failing marks
 * only that row `itemsFailed` — a single degraded timeline must never blank
 * out its healthy siblings.
 */
import { describe, expect, it, vi } from "vitest";
import type { CourseSummary } from "../../entities/course.entity";
import type { CourseItem } from "../../entities/course-item.entity";
import type { LmsFailure } from "../../failures/lms.failure";
import type { ILmsRepository } from "../../repositories/i-lms.repository";
import { fetchCourseTimelines } from "../fetch-course-timelines";

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

function item(courseId: string): CourseItem {
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
    dueAt: null,
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

describe("fetchCourseTimelines", () => {
  it("rethrows the course-list failure without fanning out", async () => {
    const failure: LmsFailure = { type: "forbidden" };
    const listItems = vi.fn();

    await expect(
      fetchCourseTimelines(
        makeRepo({
          listCourses: vi.fn().mockRejectedValue(failure),
          listItems,
        }),
        "cl1",
      ),
    ).rejects.toEqual(failure);
    expect(listItems).not.toHaveBeenCalled();
  });

  it("reads one timeline per course and keeps the list's order", async () => {
    const listItems = vi.fn(async (courseId: string) => [item(courseId)]);
    const rows = await fetchCourseTimelines(
      makeRepo({
        listCourses: vi.fn().mockResolvedValue([course("c1"), course("c2")]),
        listItems,
      }),
      "cl1",
    );

    expect(listItems).toHaveBeenCalledTimes(2);
    expect(rows.map((row) => row.course.id)).toEqual(["c1", "c2"]);
    expect(rows[0]?.items).toHaveLength(1);
    expect(rows[0]?.itemsFailed).toBe(false);
  });

  it("degrades ONLY the course whose timeline read failed", async () => {
    const rows = await fetchCourseTimelines(
      makeRepo({
        listCourses: vi
          .fn()
          .mockResolvedValue([course("c1"), course("c2"), course("c3")]),
        listItems: vi.fn(async (courseId: string) => {
          if (courseId === "c2") throw { type: "not-found" } as LmsFailure;
          return [item(courseId)];
        }),
      }),
      "cl1",
    );

    expect(rows[1]).toMatchObject({ itemsFailed: true, items: [] });
    expect(rows[0]).toMatchObject({ itemsFailed: false });
    expect(rows[2]).toMatchObject({ itemsFailed: false });
  });

  it("never touches the timeline endpoint for a class with zero courses", async () => {
    const listItems = vi.fn();
    const rows = await fetchCourseTimelines(
      makeRepo({ listCourses: vi.fn().mockResolvedValue([]), listItems }),
      "cl1",
    );

    expect(rows).toEqual([]);
    expect(listItems).not.toHaveBeenCalled();
  });

  it("forwards the optional subject filter to the course list", async () => {
    const listCourses = vi.fn().mockResolvedValue([]);
    await fetchCourseTimelines(
      makeRepo({ listCourses, listItems: vi.fn() }),
      "cl1",
      "s-math",
    );

    expect(listCourses).toHaveBeenCalledWith("cl1", "s-math");
  });
});
