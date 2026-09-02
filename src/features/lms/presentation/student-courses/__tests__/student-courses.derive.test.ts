/**
 * `CourseWithSummary[]` → `CourseCardVm[]` (US-E24.2).
 *
 * The interesting part is `dueSoon`: the 48h urgency cut is decided ONCE on the
 * server against the request's `now`, so the card's tone cannot drift with the
 * reader's clock. These tests pin the boundary.
 */
import { describe, expect, it } from "vitest";
import type { CourseSummary } from "@/features/lms/domain/entities/course.entity";
import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import type { CourseWithSummary } from "@/features/lms/domain/use-cases/list-courses-with-summary.use-case";
import { toCourseCardVms } from "../student-courses.derive";

const NOW = new Date("2026-09-02T08:00:00Z");
const hrefFor = (id: string) => `/vi/t/t1/student/courses/${id}`;

const COURSE: CourseSummary = {
  id: "c1",
  classId: "cl1",
  subjectId: "s1",
  title: "Toán 10",
  status: "PUBLISHED",
  isDefault: true,
  createdBy: "t1",
  updatedAt: "2026-09-01T00:00:00Z",
  publishedAt: "2026-09-01T00:00:00Z",
};

function itemDue(dueAt: string): CourseItem {
  return {
    id: "i1",
    courseId: "c1",
    itemType: "ASSIGNMENT",
    refId: "i1",
    title: "Bài tập 1",
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

function row(over: Partial<CourseWithSummary> = {}): CourseWithSummary {
  return {
    course: COURSE,
    summary: { openCount: 3, nextDue: null },
    itemsFailed: false,
    ...over,
  };
}

describe("toCourseCardVms", () => {
  it("carries the course through with a pre-resolved href and a derived tone", () => {
    const [vm] = toCourseCardVms([row()], NOW, hrefFor);

    expect(vm).toMatchObject({
      id: "c1",
      title: "Toán 10",
      status: "PUBLISHED",
      isDefault: true,
      href: "/vi/t/t1/student/courses/c1",
      openCount: 3,
      nextDue: null,
      itemsFailed: false,
    });
    expect(vm?.tone).toBeTruthy();
  });

  it("marks a deadline inside 48h as due-soon", () => {
    const [vm] = toCourseCardVms(
      [
        row({
          summary: { openCount: 1, nextDue: itemDue("2026-09-03T08:00:00Z") },
        }),
      ],
      NOW,
      hrefFor,
    );

    expect(vm?.nextDue).toMatchObject({
      id: "i1",
      title: "Bài tập 1",
      itemType: "ASSIGNMENT",
      dueAt: "2026-09-03T08:00:00Z",
      dueSoon: true,
    });
  });

  it("treats exactly 48h away as still due-soon, and a minute later as not", () => {
    const at48h = toCourseCardVms(
      [
        row({
          summary: { openCount: 1, nextDue: itemDue("2026-09-04T08:00:00Z") },
        }),
      ],
      NOW,
      hrefFor,
    );
    const past48h = toCourseCardVms(
      [
        row({
          summary: { openCount: 1, nextDue: itemDue("2026-09-04T08:01:00Z") },
        }),
      ],
      NOW,
      hrefFor,
    );

    expect(at48h[0]?.nextDue?.dueSoon).toBe(true);
    expect(past48h[0]?.nextDue?.dueSoon).toBe(false);
  });

  it("degrades a failed timeline read to an unknown count, not a zero", () => {
    const [vm] = toCourseCardVms(
      [row({ summary: null, itemsFailed: true })],
      NOW,
      hrefFor,
    );

    expect(vm).toMatchObject({
      openCount: null,
      nextDue: null,
      itemsFailed: true,
    });
  });
});
