import type {
  LessonEntity,
  LessonListFilter,
} from "../../domain/entities/lesson.entity";
import type { UploadLessonInput } from "../../domain/entities/upload-lesson-input.entity";
import type { LessonBankFailure } from "../../domain/failures/lesson-bank.failure";

export interface SubjectOption {
  id: string;
  name: string;
}

export interface LessonBankScreenVM {
  /** Initial list of lessons rendered by RSC. */
  lessons: LessonEntity[];
  /** Filter state from URL search params. */
  filters: LessonListFilter;
  /** Available subjects for the filter dropdown. */
  subjects: SubjectOption[];
  /** Available department names for filtering. */
  departments: string[];
  /** Role drives read-only vs full-edit behaviour. */
  viewerRole: "teacher" | "principal";
  /** Current user id — to gate edit/delete ownership. */
  currentUserId: string;
  uploadAction: (
    input: UploadLessonInput,
  ) => Promise<
    | { ok: true; lesson: LessonEntity }
    | { ok: false; errorKey: LessonBankFailure["type"] }
  >;
  deleteAction: (
    id: string,
  ) => Promise<
    { ok: true } | { ok: false; errorKey: LessonBankFailure["type"] }
  >;
}
