import "server-only";

import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  AssignmentEntity,
  AssignmentStatusFilter,
  SubmitAssignmentInput,
} from "../../../domain/entities/assignment.entity";
import type { ChapterEntity } from "../../../domain/entities/chapter.entity";
import type {
  CourseHeader,
  CourseSummary,
} from "../../../domain/entities/course.entity";
import type { LessonContentEntity } from "../../../domain/entities/lesson.entity";
import type { LessonNoteEntity } from "../../../domain/entities/lesson-note.entity";
import type { LessonQuestionEntity } from "../../../domain/entities/lesson-question.entity";
import type {
  CourseLessonsData,
  ILmsRepository,
  MarkCompleteData,
} from "../../../domain/repositories/i-lms.repository";
import { calculateCourseProgress } from "../../../domain/use-cases/calculate-course-progress";
import {
  mapAssignment,
  mapCourseHeader,
  mapCourseSummary,
} from "../../mappers/lms.mapper";
import {
  ASSIGNMENTS_DTO,
  COURSE_IDS,
  COURSE_LESSONS_DTO,
  COURSES_DTO,
  NOTES_SEED,
  QUESTIONS_SEED,
} from "./lms.fixtures";

/**
 * Module-level mutable store — mark-complete / note / question writes must
 * survive across Server Action calls (each action gets a fresh DI-built repo
 * instance). Seeded from the DTO fixtures via the mapper. `resetLmsMockStore`
 * exists for deterministic tests.
 */
interface MockStore {
  summaries: CourseSummary[];
  lessons: Record<string, ChapterEntity[]>; // courseId -> chapters (entities)
  headers: Record<string, CourseHeader>;
  notes: Map<string, LessonNoteEntity>;
  questions: Map<string, LessonQuestionEntity[]>;
  assignments: AssignmentEntity[];
}

function seedStore(): MockStore {
  const summaries = COURSES_DTO.map(mapCourseSummary);
  const lessons: Record<string, ChapterEntity[]> = {};
  const headers: Record<string, CourseHeader> = {};
  for (const [courseId, dto] of Object.entries(COURSE_LESSONS_DTO)) {
    headers[courseId] = mapCourseHeader(dto.course);
    lessons[courseId] = dto.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      isEmpty: ch.lessons.length === 0,
      lessons: ch.lessons.map((l) => ({ ...l })),
    }));
  }
  const notes = new Map<string, LessonNoteEntity>();
  for (const [lessonId, content] of Object.entries(NOTES_SEED)) {
    notes.set(lessonId, {
      lessonId,
      content,
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
  }
  const questions = new Map<string, LessonQuestionEntity[]>();
  for (const [lessonId, list] of Object.entries(QUESTIONS_SEED)) {
    questions.set(
      lessonId,
      list.map((q) => ({ ...q, lessonId })),
    );
  }
  const assignments = ASSIGNMENTS_DTO.map(mapAssignment);
  return { summaries, lessons, headers, notes, questions, assignments };
}

let store: MockStore = seedStore();

/** Test-only: restore the mock store to its seeded state. */
export function resetLmsMockStore(): void {
  store = seedStore();
}

function findLesson(
  lessonId: string,
): { courseId: string; lesson: LessonContentEntity } | null {
  for (const [courseId, chapters] of Object.entries(store.lessons)) {
    for (const chapter of chapters) {
      const lesson = chapter.lessons.find((l) => l.id === lessonId);
      if (lesson) return { courseId, lesson };
    }
  }
  return null;
}

export class MockLmsRepository implements ILmsRepository {
  async listCourses(_studentId: string): Promise<CourseSummary[]> {
    await mockDelay(200);
    return store.summaries.map((c) => ({ ...c, progress: { ...c.progress } }));
  }

  async getCourseLessons(courseId: string): Promise<CourseLessonsData> {
    await mockDelay(150);
    if (!COURSE_IDS.has(courseId)) throw new Error("not-found");
    const chapters = store.lessons[courseId] ?? [];
    const header = store.headers[courseId] ?? {
      id: courseId,
      name: store.summaries.find((c) => c.id === courseId)?.name ?? "",
      tone: store.summaries.find((c) => c.id === courseId)?.tone ?? "primary",
    };
    return {
      course: header,
      chapters: chapters.map((ch) => ({
        ...ch,
        lessons: ch.lessons.map((l) => ({ ...l })),
      })),
    };
  }

  async markLessonComplete(lessonId: string): Promise<MarkCompleteData> {
    await mockDelay(250);
    const found = findLesson(lessonId);
    if (!found) throw new Error("not-found");
    // Idempotent: mark done (no-op if already done).
    found.lesson.done = true;

    const chapters = store.lessons[found.courseId] ?? [];
    const all = chapters.flatMap((ch) => ch.lessons);
    const done = all.filter((l) => l.done).length;
    const courseProgress = calculateCourseProgress(done, all.length);

    // Keep the courses-list summary consistent for RSC re-fetch.
    const summary = store.summaries.find((c) => c.id === found.courseId);
    if (summary) summary.progress = courseProgress;

    return { lesson: { ...found.lesson }, courseProgress };
  }

  async getNote(lessonId: string): Promise<LessonNoteEntity | null> {
    await mockDelay(100);
    return store.notes.get(lessonId) ?? null;
  }

  async saveNote(lessonId: string, content: string): Promise<LessonNoteEntity> {
    await mockDelay(150);
    const note: LessonNoteEntity = {
      lessonId,
      content,
      updatedAt: new Date().toISOString(),
    };
    store.notes.set(lessonId, note);
    return note;
  }

  async listQuestions(lessonId: string): Promise<LessonQuestionEntity[]> {
    await mockDelay(120);
    return (store.questions.get(lessonId) ?? []).map((q) => ({ ...q }));
  }

  async askQuestion(
    lessonId: string,
    question: string,
  ): Promise<LessonQuestionEntity> {
    await mockDelay(150);
    const entry: LessonQuestionEntity = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      lessonId,
      question,
      answer: null,
      askedAt: new Date().toISOString(),
    };
    const existing = store.questions.get(lessonId) ?? [];
    store.questions.set(lessonId, [entry, ...existing]);
    return { ...entry };
  }

  async listAssignments(
    _studentId: string,
    statusFilter?: AssignmentStatusFilter,
  ): Promise<AssignmentEntity[]> {
    await mockDelay(200);
    const all = store.assignments.map((a) => ({ ...a }));
    if (!statusFilter || statusFilter === "all") return all;
    return all.filter((a) => a.status === statusFilter);
  }

  async submitAssignment(
    assignmentId: string,
    input: SubmitAssignmentInput,
  ): Promise<AssignmentEntity> {
    await mockDelay(250);
    const found = store.assignments.find((a) => a.id === assignmentId);
    if (!found) throw new Error("not-found");
    // Concurrent-transition guard: a re-opened stale sheet must not double-submit.
    if (found.status !== "pending") throw new Error("already-submitted");
    found.status = "submitted";
    found.submittedAt = new Date().toISOString();
    if (input.answerText !== undefined) found.answerText = input.answerText;
    if (input.fileName !== undefined) found.fileName = input.fileName;
    return { ...found };
  }
}
