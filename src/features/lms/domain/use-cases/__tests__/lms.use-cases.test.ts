/**
 * Domain use-case tests (US-E24.1). The repositories throw an `LmsFailure`
 * object; every use-case must turn that into `Result.ok === false` carrying the
 * SAME failure — no re-mapping, no swallowing, no `unknown` fallback for a
 * failure the repository already classified.
 */
import { describe, expect, it, vi } from "vitest";
import type {
  Assignment,
  AssignmentSummary,
} from "../../entities/assignment.entity";
import type { Course, CourseSummary } from "../../entities/course.entity";
import type { CourseItem } from "../../entities/course-item.entity";
import type { Lesson } from "../../entities/lesson.entity";
import type { Submission } from "../../entities/submission.entity";
import type { LmsFailure } from "../../failures/lms.failure";
import type { ILmsRepository } from "../../repositories/i-lms.repository";
import { isOverdue } from "../derive-overdue";
import { GetAssignmentDetailUseCase } from "../get-assignment.use-case";
import { GetCourseUseCase } from "../get-course.use-case";
import { GetLessonUseCase } from "../get-lesson.use-case";
import { ListAssignmentsUseCase } from "../list-assignments.use-case";
import { ListCourseItemsUseCase } from "../list-course-items.use-case";
import { ListCoursesUseCase } from "../list-courses.use-case";
import { SubmitAssignmentUseCase } from "../submit-assignment.use-case";

const COURSE_SUMMARY: CourseSummary = {
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

const COURSE: Course = {
  ...COURSE_SUMMARY,
  description: "Mô tả",
  createdAt: "2026-08-01T00:00:00Z",
};

const ITEM: CourseItem = {
  id: "i1",
  courseId: "c1",
  itemType: "LESSON",
  refId: "i1",
  title: "Bài 1",
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

const LESSON: Lesson = {
  id: "l1",
  courseId: "c1",
  title: "Bài 1",
  content: "Nội dung",
  position: 0,
  startAt: null,
  dueAt: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

const ASSIGNMENT_SUMMARY: AssignmentSummary = {
  id: "a1",
  classId: "cl1",
  subjectId: "s1",
  courseId: "c1",
  title: "Bài tập 1",
  dueAt: "2026-09-10T00:00:00Z",
  createdBy: "t1",
  updatedAt: "2026-09-01T00:00:00Z",
};

const ASSIGNMENT: Assignment = {
  ...ASSIGNMENT_SUMMARY,
  instructions: "Làm bài",
  startAt: null,
  state: "OPEN",
  createdAt: "2026-09-01T00:00:00Z",
};

const SUBMISSION: Submission = {
  assignmentId: "a1",
  studentUserId: "u1",
  content: "Bài làm",
  status: "SUBMITTED",
  submittedAt: "2026-09-05T00:00:00Z",
};

function repoStub(overrides: Partial<ILmsRepository> = {}): ILmsRepository {
  const notImplemented = () => {
    throw new Error("not used in this test");
  };
  return {
    listCourses: notImplemented,
    getCourse: notImplemented,
    listLessons: notImplemented,
    getLesson: notImplemented,
    listItems: notImplemented,
    listAssignments: notImplemented,
    getAssignment: notImplemented,
    getMySubmission: notImplemented,
    submitAssignment: notImplemented,
    createLesson: notImplemented,
    createAssignment: notImplemented,
    addDocumentItem: notImplemented,
    patchItem: notImplemented,
    reorderItems: notImplemented,
    ...overrides,
  } as ILmsRepository;
}

/** A repository rejection, exactly as the real repo throws it. */
const throwing = (failure: LmsFailure) =>
  vi.fn(async () => Promise.reject(failure));

describe("ListCoursesUseCase", () => {
  it("passes classId + subjectId straight through and returns the rows", async () => {
    const listCourses = vi.fn(async () => [COURSE_SUMMARY]);
    const result = await new ListCoursesUseCase(
      repoStub({ listCourses }),
    ).execute("cl1", "s1");

    expect(listCourses).toHaveBeenCalledWith("cl1", "s1");
    expect(result).toEqual({ ok: true, data: [COURSE_SUMMARY] });
  });

  it("surfaces a class-scope denial as `forbidden`, not an empty list", async () => {
    const result = await new ListCoursesUseCase(
      repoStub({ listCourses: throwing({ type: "forbidden" }) }),
    ).execute("cl1");

    expect(result).toEqual({ ok: false, failure: { type: "forbidden" } });
  });
});

describe("GetCourseUseCase", () => {
  it("returns the course", async () => {
    const result = await new GetCourseUseCase(
      repoStub({ getCourse: vi.fn(async () => COURSE) }),
    ).execute("c1");
    expect(result).toEqual({ ok: true, data: COURSE });
  });

  it("maps a repository failure through unchanged", async () => {
    const result = await new GetCourseUseCase(
      repoStub({ getCourse: throwing({ type: "not-found" }) }),
    ).execute("c1");
    expect(result).toEqual({ ok: false, failure: { type: "not-found" } });
  });

  it("degrades a stray `{ type }` object to `unknown` — never leaks its type as an errorKey", async () => {
    // A thrown object that merely LOOKS like a failure (any library error with
    // a `type` field) must not have its `type` handed to the client, where
    // `t("errors." + key)` would render a raw untranslated key.
    const result = await new GetCourseUseCase(
      repoStub({
        getCourse: vi.fn(async () =>
          Promise.reject({ type: "ECONNRESET", message: "socket hang up" }),
        ),
      }),
    ).execute("c1");
    expect(result).toEqual({ ok: false, failure: { type: "unknown" } });
  });

  it("degrades a non-failure throw to `unknown` instead of escaping", async () => {
    const result = await new GetCourseUseCase(
      repoStub({
        getCourse: vi.fn(async () => Promise.reject(new Error("boom"))),
      }),
    ).execute("c1");
    expect(result).toEqual({ ok: false, failure: { type: "unknown" } });
  });
});

describe("ListCourseItemsUseCase", () => {
  it("preserves the BE ordering verbatim", async () => {
    const second = { ...ITEM, id: "i2", position: 1 };
    const result = await new ListCourseItemsUseCase(
      repoStub({ listItems: vi.fn(async () => [ITEM, second]) }),
    ).execute("c1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.map((i) => i.id)).toEqual(["i1", "i2"]);
  });
});

describe("GetLessonUseCase", () => {
  it("passes both ids", async () => {
    const getLesson = vi.fn(async () => LESSON);
    await new GetLessonUseCase(repoStub({ getLesson })).execute("c1", "l1");
    expect(getLesson).toHaveBeenCalledWith("c1", "l1");
  });
});

describe("ListAssignmentsUseCase", () => {
  it("passes the optional filter through", async () => {
    const listAssignments = vi.fn(async () => [ASSIGNMENT_SUMMARY]);
    const result = await new ListAssignmentsUseCase(
      repoStub({ listAssignments }),
    ).execute("cl1", { courseId: "c1" });

    expect(listAssignments).toHaveBeenCalledWith("cl1", { courseId: "c1" });
    expect(result).toEqual({ ok: true, data: [ASSIGNMENT_SUMMARY] });
  });
});

describe("GetAssignmentDetailUseCase", () => {
  it("composes the assignment with the caller's own submission", async () => {
    const result = await new GetAssignmentDetailUseCase(
      repoStub({
        getAssignment: vi.fn(async () => ASSIGNMENT),
        getMySubmission: vi.fn(async () => SUBMISSION),
      }),
    ).execute("a1");

    expect(result).toEqual({
      ok: true,
      data: { assignment: ASSIGNMENT, mySubmission: SUBMISSION },
    });
  });

  it("treats 'not submitted yet' (null) as success, not a failure", async () => {
    const result = await new GetAssignmentDetailUseCase(
      repoStub({
        getAssignment: vi.fn(async () => ASSIGNMENT),
        getMySubmission: vi.fn(async () => null),
      }),
    ).execute("a1");

    expect(result).toEqual({
      ok: true,
      data: { assignment: ASSIGNMENT, mySubmission: null },
    });
  });

  it("does not read the submission when the assignment itself is denied", async () => {
    const getMySubmission = vi.fn(async () => null);
    const result = await new GetAssignmentDetailUseCase(
      repoStub({
        getAssignment: throwing({ type: "not-found" }),
        getMySubmission,
      }),
    ).execute("a1");

    expect(getMySubmission).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, failure: { type: "not-found" } });
  });
});

describe("SubmitAssignmentUseCase", () => {
  it("returns the created submission", async () => {
    const submitAssignment = vi.fn(async () => SUBMISSION);
    const result = await new SubmitAssignmentUseCase(
      repoStub({ submitAssignment }),
    ).execute("a1", "Bài làm");

    expect(submitAssignment).toHaveBeenCalledWith("a1", "Bài làm");
    expect(result).toEqual({ ok: true, data: SUBMISSION });
  });

  it.each([
    ["already-submitted"],
    ["closed"],
    ["not-found"],
  ] as const)("propagates the `%s` failure verbatim", async (type) => {
    const result = await new SubmitAssignmentUseCase(
      repoStub({ submitAssignment: throwing({ type }) }),
    ).execute("a1", "Bài làm");

    expect(result).toEqual({ ok: false, failure: { type } });
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-09-10T12:00:00Z");

  it("is false when there is no deadline at all", () => {
    expect(isOverdue(null, now)).toBe(false);
  });

  it("is true strictly after the deadline", () => {
    expect(isOverdue("2026-09-10T11:59:59Z", now)).toBe(true);
    expect(isOverdue("2026-09-10T12:00:00Z", now)).toBe(false);
    expect(isOverdue("2026-09-11T00:00:00Z", now)).toBe(false);
  });

  it("is false for an unparseable timestamp rather than throwing", () => {
    expect(isOverdue("not-a-date", now)).toBe(false);
  });
});
