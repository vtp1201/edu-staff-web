import type { ChapterEntity } from "@/features/lms/domain/entities/chapter.entity";
import type {
  CourseProgress,
  CourseTone,
} from "@/features/lms/domain/entities/course.entity";
import type {
  LessonContentEntity,
  LessonTextBlock,
  LessonType,
} from "@/features/lms/domain/entities/lesson.entity";
import type { LessonNoteEntity } from "@/features/lms/domain/entities/lesson-note.entity";
import type { LessonQuestionEntity } from "@/features/lms/domain/entities/lesson-question.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";

export interface LessonListItemVm {
  id: string;
  order: number;
  title: string;
  type: LessonType;
  /** Pre-formatted ("32 phút" / "12 trang") — client never branches to format. */
  durationLabel: string;
  done: boolean;
}

/** Lightweight projection used by ChapterList (no content payload). */
export interface ChapterVm {
  id: string;
  title: string;
  lessons: LessonListItemVm[];
  isEmpty: boolean;
}

/** Discriminated union — LessonBody switches on `type`. */
export type ActiveLessonVm =
  | {
      type: "video";
      id: string;
      title: string;
      chapterTitle: string | null;
      durationLabel: string;
      done: boolean;
    }
  | {
      type: "pdf";
      id: string;
      title: string;
      chapterTitle: string | null;
      durationLabel: string;
      done: boolean;
      downloadHref: string;
    }
  | {
      type: "text";
      id: string;
      title: string;
      chapterTitle: string | null;
      durationLabel: string;
      done: boolean;
      blocks: LessonTextBlock[];
    }
  | null;

export interface LessonPlayerVm {
  courseId: string;
  courseName: string;
  tone: CourseTone;
  /** Breadcrumb "back" link, pre-resolved. */
  coursesListHref: string;
  /** Full lesson hierarchy (content included) — the client caches this and
   *  switches lessons without a refetch (mock delivers all content up front). */
  chapters: ChapterEntity[];
  /** Server-picked: active → first incomplete → first lesson → null. */
  initialActiveLessonId: string | null;
  errorKey: LmsFailure["type"] | null;
}

export interface MarkCompleteResult {
  ok: boolean;
  data?: { lesson: LessonContentEntity; courseProgress: CourseProgress };
  errorKey?: LmsFailure["type"];
}

export interface SaveNoteResult {
  ok: boolean;
  data?: LessonNoteEntity;
  errorKey?: LmsFailure["type"];
}

export interface AskQuestionResult {
  ok: boolean;
  data?: LessonQuestionEntity;
  errorKey?: LmsFailure["type"];
}

export interface GetNoteResult {
  ok: boolean;
  data?: LessonNoteEntity | null;
  errorKey?: LmsFailure["type"];
}

export interface ListQuestionsResult {
  ok: boolean;
  data?: LessonQuestionEntity[];
  errorKey?: LmsFailure["type"];
}

/** Server Action refs — passed as props, never imported by presentation. */
export interface LessonPlayerActions {
  markLessonComplete: (lessonId: string) => Promise<MarkCompleteResult>;
  getNote: (lessonId: string) => Promise<GetNoteResult>;
  saveNote: (lessonId: string, content: string) => Promise<SaveNoteResult>;
  listQuestions: (lessonId: string) => Promise<ListQuestionsResult>;
  askQuestion: (
    lessonId: string,
    question: string,
  ) => Promise<AskQuestionResult>;
}
