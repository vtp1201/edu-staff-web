/**
 * Cross-subject row VMs (US-E24.4): the 48h urgency cut and the CTA
 * discriminant, both resolved SERVER-SIDE against the route's single `now`
 * (same rule as the card grid — a tab left open must not silently re-colour
 * itself, and presentation formats rather than decides).
 */
import { describe, expect, it } from "vitest";
import type { CourseSummary } from "@/features/lms/domain/entities/course.entity";
import type {
  CourseItem,
  CourseItemState,
  CourseItemType,
} from "@/features/lms/domain/entities/course-item.entity";
import type { CrossSubjectRow } from "@/features/lms/domain/use-cases/sort-cross-subject-items";
import {
  parseCoursesView,
  parseSubTab,
  toCrossSubjectGroupsVm,
  toCrossSubjectRowVm,
} from "../cross-subject.derive";

const NOW = new Date("2026-09-02T08:00:00Z");
const HOUR = 60 * 60 * 1000;
const inHours = (h: number) => new Date(NOW.getTime() + h * HOUR).toISOString();

const HREFS = {
  courseHrefFor: (courseId: string) => `/vi/t/t1/student/courses/${courseId}`,
  examHrefFor: (examId: string) => `/vi/t/t1/student/exams/${examId}`,
};

function course(id = "c1"): CourseSummary {
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

function row(over: {
  itemType?: CourseItemType;
  state?: CourseItemState;
  dueAt?: string | null;
  startAt?: string | null;
  examId?: string | null;
  examUrl?: string | null;
  courseId?: string;
}): CrossSubjectRow {
  const item: CourseItem = {
    id: "i1",
    courseId: over.courseId ?? "c1",
    itemType: over.itemType ?? "ASSIGNMENT",
    refId: "i1",
    title: "Bài tập 1",
    description: null,
    url: null,
    position: 0,
    startAt: over.startAt ?? null,
    dueAt: over.dueAt ?? null,
    state: over.state ?? "OPEN",
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    exam:
      over.examId === undefined && over.examUrl === undefined
        ? null
        : {
            examId: over.examId ?? "i1",
            scheduledDate: null,
            durationMinutes: null,
            examUrl: over.examUrl ?? null,
          },
  };
  return { course: course(over.courseId ?? "c1"), item };
}

const vmOf = (over: Parameters<typeof row>[0]) =>
  toCrossSubjectRowVm(row(over), NOW, HREFS);

describe("toCrossSubjectRowVm — urgency", () => {
  it("marks an OPEN row urgent exactly AT the 48h boundary", () => {
    const vm = vmOf({ dueAt: inHours(48) });
    expect(vm.urgent).toBe(true);
    expect(vm.hoursLeft).toBe(48);
  });

  it("does not mark an OPEN row past 48h urgent", () => {
    const vm = vmOf({ dueAt: inHours(49) });
    expect(vm.urgent).toBe(false);
    expect(vm.hoursLeft).toBeNull();
  });

  it("never marks a CLOSED row urgent, however far past its deadline", () => {
    expect(vmOf({ state: "CLOSED", dueAt: inHours(-100) }).urgent).toBe(false);
    expect(vmOf({ state: "CLOSED", dueAt: inHours(1) }).urgent).toBe(false);
  });

  it("never marks an UPCOMING row urgent", () => {
    expect(
      vmOf({ itemType: "EXAM", state: "UPCOMING_HIDDEN", dueAt: inHours(2) })
        .urgent,
    ).toBe(false);
  });

  it("is not urgent without a deadline (unknown is not imminent)", () => {
    expect(vmOf({ dueAt: null }).urgent).toBe(false);
  });

  it("floors the countdown at 1 hour so it never reads 'còn 0 giờ'", () => {
    expect(vmOf({ dueAt: inHours(0.2) }).hoursLeft).toBe(1);
    // BE may still say OPEN a moment past the deadline; a negative countdown
    // would be worse copy than the floor.
    expect(vmOf({ dueAt: inHours(-3) }).hoursLeft).toBe(1);
  });

  it("rounds to whole hours", () => {
    expect(vmOf({ dueAt: inHours(5.4) }).hoursLeft).toBe(5);
    expect(vmOf({ dueAt: inHours(5.6) }).hoursLeft).toBe(6);
  });

  it("treats an unparseable deadline as absent rather than urgent", () => {
    expect(vmOf({ dueAt: "not-a-date" }).urgent).toBe(false);
  });
});

describe("toCrossSubjectRowVm — CTA", () => {
  it("sends an OPEN exam to the in-app exam route", () => {
    expect(vmOf({ itemType: "EXAM", examId: "ex9" }).cta).toEqual({
      kind: "start",
      href: "/vi/t/t1/student/exams/ex9",
      external: false,
    });
  });

  it("prefers the deployment's external exam deep link when BE sent one", () => {
    expect(
      vmOf({
        itemType: "EXAM",
        examId: "ex9",
        examUrl: "https://exams.example.edu/ex9",
      }).cta,
    ).toEqual({
      kind: "start",
      href: "https://exams.example.edu/ex9",
      external: true,
    });
  });

  it("refuses an unsafe exam deep link and falls back to the in-app route", () => {
    expect(
      vmOf({
        itemType: "EXAM",
        examId: "ex9",
        examUrl: "javascript:alert(1)",
      }).cta,
    ).toMatchObject({ href: "/vi/t/t1/student/exams/ex9", external: false });
  });

  it("degrades to 'view' when an OPEN exam carries no exam reference at all", () => {
    expect(vmOf({ itemType: "EXAM" }).cta).toEqual({
      kind: "view",
      href: "/vi/t/t1/student/courses/c1",
      external: false,
    });
  });

  it("sends a CLOSED or UPCOMING exam back to its course, not into the exam", () => {
    expect(
      vmOf({ itemType: "EXAM", state: "CLOSED", examId: "ex9" }).cta.kind,
    ).toBe("view");
    expect(
      vmOf({ itemType: "EXAM", state: "UPCOMING_HIDDEN", examId: "ex9" }).cta
        .kind,
    ).toBe("view");
  });

  it("always sends an assignment to its course (there is no assignment player route here)", () => {
    expect(vmOf({ itemType: "ASSIGNMENT", courseId: "c7" }).cta).toEqual({
      kind: "view",
      href: "/vi/t/t1/student/courses/c7",
      external: false,
    });
  });
});

describe("toCrossSubjectGroupsVm", () => {
  it("maps all three groups and gives every row a course-scoped stable key", () => {
    const vm = toCrossSubjectGroupsVm(
      {
        open: [row({ courseId: "c1", dueAt: inHours(2) })],
        upcoming: [row({ courseId: "c2", state: "UPCOMING_HIDDEN" })],
        closed: [row({ courseId: "c3", state: "CLOSED" })],
      },
      NOW,
      HREFS,
    );

    expect(vm.open[0]?.urgent).toBe(true);
    expect(vm.open[0]?.key).toBe("c1:i1");
    expect(vm.upcoming[0]?.key).toBe("c2:i1");
    expect(vm.closed[0]?.key).toBe("c3:i1");
  });

  it("carries the course title and a stable decorative tone onto each row", () => {
    const vm = toCrossSubjectGroupsVm(
      { open: [row({ courseId: "c1" })], upcoming: [], closed: [] },
      NOW,
      HREFS,
    );
    expect(vm.open[0]?.courseTitle).toBe("Course c1");
    expect(vm.open[0]?.tone).toBe(
      toCrossSubjectRowVm(row({ courseId: "c1" }), NOW, HREFS).tone,
    );
  });
});

describe("URL param parsing (the view/sub-tab state lives in the URL)", () => {
  it("defaults to the card grid for anything that is not a known view", () => {
    expect(parseCoursesView(undefined)).toBe("all");
    expect(parseCoursesView("nonsense")).toBe("all");
    expect(parseCoursesView(["assignment", "exam"])).toBe("all");
    expect(parseCoursesView("assignment")).toBe("assignment");
    expect(parseCoursesView("exam")).toBe("exam");
  });

  it("defaults the sub-tab to 'open' and accepts 'closed' on both views", () => {
    expect(parseSubTab(undefined, "assignment")).toBe("open");
    expect(parseSubTab("nonsense", "exam")).toBe("open");
    expect(parseSubTab("closed", "assignment")).toBe("closed");
  });

  it("only honours 'upcoming' on the exam view (D7: no unreleased assignments)", () => {
    expect(parseSubTab("upcoming", "exam")).toBe("upcoming");
    expect(parseSubTab("upcoming", "assignment")).toBe("open");
  });
});
