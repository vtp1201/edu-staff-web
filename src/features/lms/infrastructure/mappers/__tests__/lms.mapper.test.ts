/**
 * DTO → entity mapper tests (US-E24.1). The one reshape in this feature is the
 * `CourseItem` exam block: four FLAT wire fields become one nested `exam`
 * object that exists only for an EXAM item. Everything else is a pass-through
 * whose job is to NOT invent a value.
 */
import { describe, expect, it } from "vitest";
import type {
  AssignmentResponseDto,
  AssignmentSummaryResponseDto,
} from "../../dtos/assignment-response.dto";
import type { CourseItemResponseDto } from "../../dtos/course-item-response.dto";
import type {
  CourseResponseDto,
  CourseSummaryResponseDto,
} from "../../dtos/course-response.dto";
import type { LessonResponseDto } from "../../dtos/lesson-response.dto";
import type { SubmissionResponseDto } from "../../dtos/submission-response.dto";
import {
  toAssignment,
  toAssignmentSummary,
  toCourse,
  toCourseItem,
  toCourseSummary,
  toLesson,
  toLessonSummary,
  toSubmission,
} from "../lms.mapper";

const ITEM_DTO: CourseItemResponseDto = {
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
  updatedAt: "2026-08-02T00:00:00Z",
  examId: null,
  scheduledDate: null,
  durationMinutes: null,
  examUrl: null,
};

describe("toCourseItem — the 4 item types", () => {
  it("LESSON: no document fields, no exam block", () => {
    const item = toCourseItem(ITEM_DTO);
    expect(item).toEqual({
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
      updatedAt: "2026-08-02T00:00:00Z",
      exam: null,
    });
  });

  it("ASSIGNMENT: refId points at the assignment, exam stays null", () => {
    const item = toCourseItem({
      ...ITEM_DTO,
      id: "a1",
      itemType: "ASSIGNMENT",
      refId: "a1",
      dueAt: "2026-09-10T00:00:00Z",
      state: "CLOSED",
    });
    expect(item.itemType).toBe("ASSIGNMENT");
    expect(item.refId).toBe("a1");
    expect(item.dueAt).toBe("2026-09-10T00:00:00Z");
    expect(item.state).toBe("CLOSED");
    expect(item.exam).toBeNull();
  });

  it("DOCUMENT: self-contained (description + url), refId null", () => {
    const item = toCourseItem({
      ...ITEM_DTO,
      id: "d1",
      itemType: "DOCUMENT",
      refId: null,
      description: "Tài liệu tham khảo",
      url: "https://example.org/doc.pdf",
    });
    expect(item.refId).toBeNull();
    expect(item.description).toBe("Tài liệu tham khảo");
    expect(item.url).toBe("https://example.org/doc.pdf");
    expect(item.exam).toBeNull();
  });

  it("EXAM: nests the 4 flat exam fields into `exam`", () => {
    const item = toCourseItem({
      ...ITEM_DTO,
      id: "e1",
      itemType: "EXAM",
      refId: "e1",
      startAt: "2026-09-20T01:00:00Z",
      dueAt: "2026-09-20T02:30:00Z",
      state: "UPCOMING_HIDDEN",
      examId: "e1",
      scheduledDate: "2026-09-20T01:00:00Z",
      durationMinutes: 90,
      examUrl: "https://school.example/exams/e1",
    });
    expect(item.exam).toEqual({
      examId: "e1",
      scheduledDate: "2026-09-20T01:00:00Z",
      durationMinutes: 90,
      examUrl: "https://school.example/exams/e1",
    });
    // UPCOMING_HIDDEN reaches a STUDENT only for an EXAM tile — passed through,
    // never rewritten to OPEN.
    expect(item.state).toBe("UPCOMING_HIDDEN");
  });

  it("EXAM with an unconfigured deep link / open-ended duration keeps the nulls", () => {
    const item = toCourseItem({
      ...ITEM_DTO,
      itemType: "EXAM",
      examId: "e2",
      scheduledDate: null,
      durationMinutes: null,
      examUrl: null,
    });
    expect(item.exam).toEqual({
      examId: "e2",
      scheduledDate: null,
      durationMinutes: null,
      examUrl: null,
    });
  });

  it("EXAM without an examId gets NO exam block (never a fabricated id)", () => {
    const item = toCourseItem({ ...ITEM_DTO, itemType: "EXAM", examId: null });
    expect(item.exam).toBeNull();
  });

  it("never leaks the flat exam fields onto a non-EXAM item", () => {
    // A defensive case: BE promises these are null off an EXAM row, but a
    // stray value must not silently produce an exam block on a LESSON.
    const item = toCourseItem({ ...ITEM_DTO, itemType: "LESSON", examId: "x" });
    expect(item.exam).toBeNull();
    expect(item).not.toHaveProperty("examId");
  });

  it("preserves a null window (null = open immediately / no deadline)", () => {
    const item = toCourseItem({ ...ITEM_DTO, startAt: null, dueAt: null });
    expect(item.startAt).toBeNull();
    expect(item.dueAt).toBeNull();
  });
});

describe("course mappers", () => {
  const dto: CourseResponseDto = {
    id: "c1",
    classId: "cl1",
    subjectId: "s1",
    title: "Toán 10",
    description: "Mô tả",
    status: "PUBLISHED",
    isDefault: true,
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-02T00:00:00Z",
    publishedAt: "2026-08-02T00:00:00Z",
  };

  it("toCourse passes every field through", () => {
    expect(toCourse(dto)).toEqual(dto);
  });

  it("toCourse keeps a DRAFT's null publishedAt", () => {
    expect(
      toCourse({ ...dto, status: "DRAFT", publishedAt: null }),
    ).toMatchObject({
      status: "DRAFT",
      publishedAt: null,
    });
  });

  it("toCourseSummary does NOT invent description/createdAt", () => {
    const summaryDto: CourseSummaryResponseDto = {
      id: "c1",
      classId: "cl1",
      subjectId: "s1",
      title: "Toán 10",
      status: "PUBLISHED",
      isDefault: false,
      createdBy: "t1",
      updatedAt: "2026-08-02T00:00:00Z",
      publishedAt: "2026-08-02T00:00:00Z",
    };
    const summary = toCourseSummary(summaryDto);
    expect(summary).toEqual(summaryDto);
    expect(summary).not.toHaveProperty("description");
    expect(summary).not.toHaveProperty("createdAt");
  });
});

describe("lesson mappers", () => {
  const dto: LessonResponseDto = {
    id: "l1",
    courseId: "c1",
    title: "Bài 1",
    content: "Nội dung dài",
    position: 3,
    startAt: "2026-09-01T00:00:00Z",
    dueAt: null,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-02T00:00:00Z",
  };

  it("toLesson keeps the content body", () => {
    expect(toLesson(dto)).toEqual(dto);
  });

  it("toLessonSummary carries no content field at all", () => {
    const summary = toLessonSummary({
      id: "l1",
      courseId: "c1",
      title: "Bài 1",
      position: 3,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-02T00:00:00Z",
    });
    expect(summary).not.toHaveProperty("content");
    expect(summary.position).toBe(3);
  });
});

describe("assignment + submission mappers", () => {
  const dto: AssignmentResponseDto = {
    id: "a1",
    classId: "cl1",
    subjectId: "s1",
    courseId: "c1",
    title: "Bài tập 1",
    instructions: null,
    startAt: null,
    dueAt: "2026-09-10T00:00:00Z",
    state: "OPEN",
    createdBy: "t1",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };

  it("toAssignment keeps a null instructions as null (not an empty string)", () => {
    const a = toAssignment(dto);
    expect(a.instructions).toBeNull();
    expect(a.state).toBe("OPEN");
  });

  it("toAssignment keeps a null courseId (pre-US-229 rows)", () => {
    expect(toAssignment({ ...dto, courseId: null }).courseId).toBeNull();
  });

  it("toAssignmentSummary exposes no `state` — the list row does not carry one", () => {
    const summaryDto: AssignmentSummaryResponseDto = {
      id: "a1",
      classId: "cl1",
      subjectId: "s1",
      courseId: "c1",
      title: "Bài tập 1",
      dueAt: null,
      createdBy: "t1",
      updatedAt: "2026-09-01T00:00:00Z",
    };
    const summary = toAssignmentSummary(summaryDto);
    expect(summary).toEqual(summaryDto);
    expect(summary).not.toHaveProperty("state");
    expect(summary).not.toHaveProperty("instructions");
  });

  it("toSubmission passes the single-value status through", () => {
    const dtoSub: SubmissionResponseDto = {
      assignmentId: "a1",
      studentUserId: "u1",
      content: "Bài làm",
      status: "SUBMITTED",
      submittedAt: "2026-09-05T00:00:00Z",
    };
    expect(toSubmission(dtoSub)).toEqual(dtoSub);
  });
});
