/**
 * `ListCoursesWithItemsUseCase` (US-E24.4) — the cross-subject read: the SAME
 * class fan-out the card grid uses, but returning the raw timelines instead of
 * a folded summary, wrapped in the shared `Result` ceremony.
 */
import { describe, expect, it, vi } from "vitest";
import type { CourseSummary } from "../../entities/course.entity";
import type { CourseItem } from "../../entities/course-item.entity";
import type { LmsFailure } from "../../failures/lms.failure";
import type { ILmsRepository } from "../../repositories/i-lms.repository";
import { ListCoursesWithItemsUseCase } from "../list-courses-with-items.use-case";

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
    itemType: "EXAM",
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

describe("ListCoursesWithItemsUseCase", () => {
  it("fails the whole read when the course list fails", async () => {
    const failure: LmsFailure = { type: "forbidden" };
    const useCase = new ListCoursesWithItemsUseCase(
      makeRepo({
        listCourses: vi.fn().mockRejectedValue(failure),
        listItems: vi.fn(),
      }),
    );

    expect(await useCase.execute("cl1")).toEqual({ ok: false, failure });
  });

  it("returns every course's timeline, flagging only the failed one", async () => {
    const useCase = new ListCoursesWithItemsUseCase(
      makeRepo({
        listCourses: vi.fn().mockResolvedValue([course("c1"), course("c2")]),
        listItems: vi.fn(async (courseId: string) => {
          if (courseId === "c2") throw { type: "network-error" } as LmsFailure;
          return [item(courseId)];
        }),
      }),
    );

    const result = await useCase.execute("cl1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]).toMatchObject({ itemsFailed: false });
    expect(result.data[0]?.items).toHaveLength(1);
    expect(result.data[1]).toMatchObject({ itemsFailed: true, items: [] });
  });

  it("degrades a non-LmsFailure throw to `unknown` rather than escaping", async () => {
    const useCase = new ListCoursesWithItemsUseCase(
      makeRepo({
        listCourses: vi.fn().mockRejectedValue(new Error("boom")),
        listItems: vi.fn(),
      }),
    );

    expect(await useCase.execute("cl1")).toEqual({
      ok: false,
      failure: { type: "unknown" },
    });
  });
});
