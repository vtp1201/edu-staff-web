import "server-only";

import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  Assignment,
  AssignmentSummary,
} from "../../../domain/entities/assignment.entity";
import type {
  Course,
  CourseSummary,
} from "../../../domain/entities/course.entity";
import type { CourseItem } from "../../../domain/entities/course-item.entity";
import type {
  Lesson,
  LessonSummary,
} from "../../../domain/entities/lesson.entity";
import type { Submission } from "../../../domain/entities/submission.entity";
import type { LmsFailure } from "../../../domain/failures/lms.failure";
import type {
  CreateAssignmentInput,
  CreateDocumentItemInput,
  CreateLessonInput,
  ILmsRepository,
  UpdateCourseItemInput,
} from "../../../domain/repositories/i-lms.repository";
import {
  MOCK_ASSIGNMENT_SUMMARIES,
  MOCK_ASSIGNMENTS,
  MOCK_CLASS_ID,
  MOCK_COURSE_ITEMS,
  MOCK_COURSE_SUMMARIES,
  MOCK_COURSES,
  MOCK_LESSONS,
  MOCK_STUDENT_USER_ID,
  MOCK_SUBMISSIONS,
} from "./lms.fixtures";

/** Repositories signal failure by THROWING an `LmsFailure` — mirror that here
 *  so a mock-mode screen exercises the exact same error path as real mode. */
function reject(type: LmsFailure["type"]): never {
  const failure: LmsFailure = { type } as LmsFailure;
  throw failure;
}

/**
 * In-memory `lms` repository (US-E24.1). Shaped to the REAL contract — same
 * projections (list rows really are narrower), same enums, same failure
 * semantics (single-attempt submit → `already-submitted`; a past-`dueAt`
 * submit → `closed`; an unknown/foreign id → `not-found`).
 *
 * State is module-level and mutable so a submit made in one request is visible
 * to the next during a dev session.
 */
const submissions: Submission[] = MOCK_SUBMISSIONS.map((s) => ({ ...s }));
const items: CourseItem[] = MOCK_COURSE_ITEMS.map((i) => ({ ...i }));
/** Mutable copy: `publishCourse` flips a status, and the next request must see
 *  the new one (same reason `items`/`submissions` are copies). */
const courses: Course[] = MOCK_COURSES.map((c) => ({ ...c }));

export class MockLmsRepository implements ILmsRepository {
  async listCourses(
    classId: string,
    subjectId?: string,
  ): Promise<CourseSummary[]> {
    await mockDelay();
    // BE answers a foreign classId with `403 LMS_CLASS_NOT_FOUND`, never [].
    if (classId !== MOCK_CLASS_ID) reject("forbidden");
    return MOCK_COURSE_SUMMARIES.filter(
      (c) => subjectId === undefined || c.subjectId === subjectId,
    ).map((row) => ({
      ...row,
      // Read the LIVE status: a publish made this session must be visible to
      // the class-scoped list too, not just the single-course read.
      status: courses.find((c) => c.id === row.id)?.status ?? row.status,
      publishedAt:
        courses.find((c) => c.id === row.id)?.publishedAt ?? row.publishedAt,
    }));
  }

  async getCourse(courseId: string): Promise<Course> {
    await mockDelay();
    const course = courses.find((c) => c.id === courseId);
    if (!course) reject("not-found");
    return { ...course };
  }

  async listLessons(courseId: string): Promise<LessonSummary[]> {
    await mockDelay();
    if (!courses.some((c) => c.id === courseId)) reject("not-found");
    return MOCK_LESSONS.filter((l) => l.courseId === courseId).map((l) => ({
      id: l.id,
      courseId: l.courseId,
      title: l.title,
      position: l.position,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
  }

  async getLesson(courseId: string, lessonId: string): Promise<Lesson> {
    await mockDelay();
    const lesson = MOCK_LESSONS.find(
      (l) => l.id === lessonId && l.courseId === courseId,
    );
    if (!lesson) reject("not-found");
    return { ...lesson };
  }

  async listItems(courseId: string): Promise<CourseItem[]> {
    await mockDelay();
    if (!courses.some((c) => c.id === courseId)) reject("not-found");
    return items
      .filter((i) => i.courseId === courseId)
      .map((i) => ({ ...i, exam: i.exam ? { ...i.exam } : null }));
  }

  async listAssignments(
    classId: string,
    filter?: { subjectId?: string; courseId?: string },
  ): Promise<AssignmentSummary[]> {
    await mockDelay();
    if (classId !== MOCK_CLASS_ID) reject("forbidden");
    return MOCK_ASSIGNMENT_SUMMARIES.filter(
      (a) =>
        (filter?.subjectId === undefined || a.subjectId === filter.subjectId) &&
        (filter?.courseId === undefined || a.courseId === filter.courseId),
    ).map((a) => ({ ...a }));
  }

  async getAssignment(assignmentId: string): Promise<Assignment> {
    await mockDelay();
    const assignment = MOCK_ASSIGNMENTS.find((a) => a.id === assignmentId);
    if (!assignment) reject("not-found");
    return { ...assignment };
  }

  async getMySubmission(assignmentId: string): Promise<Submission | null> {
    await mockDelay();
    if (!MOCK_ASSIGNMENTS.some((a) => a.id === assignmentId)) {
      reject("not-found");
    }
    const found = submissions.find(
      (s) =>
        s.assignmentId === assignmentId &&
        s.studentUserId === MOCK_STUDENT_USER_ID,
    );
    return found ? { ...found } : null;
  }

  async submitAssignment(
    assignmentId: string,
    content: string,
  ): Promise<Submission> {
    await mockDelay();
    const assignment = MOCK_ASSIGNMENTS.find((a) => a.id === assignmentId);
    if (!assignment) reject("not-found");
    if (
      submissions.some(
        (s) =>
          s.assignmentId === assignmentId &&
          s.studentUserId === MOCK_STUDENT_USER_ID,
      )
    ) {
      reject("already-submitted");
    }
    // BE US-228 made `dueAt` enforcing — a late submit is REJECTED, not flagged.
    if (assignment.dueAt !== null && new Date(assignment.dueAt) < new Date()) {
      reject("closed");
    }
    const created: Submission = {
      assignmentId,
      studentUserId: MOCK_STUDENT_USER_ID,
      content,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    };
    submissions.push(created);
    return { ...created };
  }

  // ── teacher commands (no UI yet — E24.10) ───────────────────────────────

  async createLesson(
    courseId: string,
    input: CreateLessonInput,
  ): Promise<Lesson> {
    await mockDelay();
    if (!courses.some((c) => c.id === courseId)) reject("not-found");
    const now = new Date().toISOString();
    return {
      id: `le-${Date.now()}`,
      courseId,
      title: input.title,
      content: input.content,
      position: input.position ?? MOCK_LESSONS.length,
      startAt: input.startAt ?? null,
      dueAt: input.dueAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
    await mockDelay();
    const now = new Date().toISOString();
    return {
      id: `as-${Date.now()}`,
      classId: input.classId,
      subjectId: input.subjectId,
      courseId: input.courseId,
      title: input.title,
      instructions: input.instructions ?? null,
      startAt: input.startAt ?? null,
      dueAt: input.dueAt ?? null,
      state: "OPEN",
      createdBy: "u-teacher-1",
      createdAt: now,
      updatedAt: now,
    };
  }

  async addDocumentItem(
    courseId: string,
    input: CreateDocumentItemInput,
  ): Promise<CourseItem> {
    await mockDelay();
    if (!courses.some((c) => c.id === courseId)) reject("not-found");
    if (!input.url.startsWith("https://")) reject("invalid-url");
    if (
      input.startAt &&
      input.dueAt &&
      new Date(input.dueAt) <= new Date(input.startAt)
    ) {
      reject("invalid-window");
    }
    const now = new Date().toISOString();
    const created: CourseItem = {
      id: `do-${Date.now()}`,
      courseId,
      itemType: "DOCUMENT",
      refId: null,
      title: input.title,
      description: input.description ?? null,
      url: input.url,
      position:
        input.position ?? items.filter((i) => i.courseId === courseId).length,
      startAt: input.startAt ?? null,
      dueAt: input.dueAt ?? null,
      state: "OPEN",
      createdBy: "u-teacher-1",
      createdAt: now,
      updatedAt: now,
      exam: null,
    };
    items.push(created);
    return { ...created };
  }

  async patchItem(
    courseId: string,
    itemId: string,
    patch: UpdateCourseItemInput,
  ): Promise<CourseItem> {
    await mockDelay();
    const item = items.find((i) => i.id === itemId && i.courseId === courseId);
    if (!item) reject("not-found");
    const touchesWindow = "startAt" in patch || "dueAt" in patch;
    if (item.itemType === "EXAM" && touchesWindow) {
      reject("exam-window-not-editable");
    }
    const touchesDocFields =
      patch.title !== undefined ||
      patch.description !== undefined ||
      patch.url !== undefined;
    if (item.itemType !== "DOCUMENT" && touchesDocFields) {
      reject("not-document");
    }
    // Three-state: `undefined` leaves the half untouched, explicit null clears.
    if (patch.title !== undefined) item.title = patch.title;
    if (patch.description !== undefined) item.description = patch.description;
    if (patch.url !== undefined) item.url = patch.url;
    if ("startAt" in patch) item.startAt = patch.startAt ?? null;
    if ("dueAt" in patch) item.dueAt = patch.dueAt ?? null;
    item.updatedAt = new Date().toISOString();
    return { ...item, exam: item.exam ? { ...item.exam } : null };
  }

  async reorderItems(
    courseId: string,
    itemIds: string[],
  ): Promise<CourseItem[]> {
    await mockDelay();
    const current = items.filter((i) => i.courseId === courseId);
    // BE requires EXACTLY the course's current items — no omission, no dupe.
    const unique = new Set(itemIds);
    if (unique.size !== itemIds.length || unique.size !== current.length) {
      reject("not-found");
    }
    const byId = new Map(current.map((i) => [i.id, i]));
    if (itemIds.some((id) => !byId.has(id))) reject("not-found");
    itemIds.forEach((id, index) => {
      const item = byId.get(id);
      if (item) item.position = index;
    });
    return itemIds
      .map((id) => byId.get(id))
      .filter((i): i is CourseItem => i !== undefined)
      .map((i) => ({ ...i, exam: i.exam ? { ...i.exam } : null }));
  }

  async publishCourse(courseId: string): Promise<Course> {
    await mockDelay();
    const course = courses.find((c) => c.id === courseId);
    if (!course) reject("not-found");
    // Terminal transition — a second call is the documented 409, never a
    // silent success (BE `LMS_COURSE_INVALID_STATUS_TRANSITION`).
    if (course.status === "PUBLISHED") reject("already-published");
    course.status = "PUBLISHED";
    course.publishedAt = new Date().toISOString();
    course.updatedAt = course.publishedAt;
    return { ...course };
  }

  async deleteItem(courseId: string, itemId: string): Promise<void> {
    await mockDelay();
    const index = items.findIndex(
      (i) => i.id === itemId && i.courseId === courseId,
    );
    if (index === -1) reject("not-found");
    const item = items[index];
    if (item && item.itemType !== "DOCUMENT") reject("not-document");
    items.splice(index, 1);
  }
}
