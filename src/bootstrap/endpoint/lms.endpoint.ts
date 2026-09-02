/**
 * `lms` service endpoints — the REAL, deployed contract
 * (`edu-api/services/lms/docs/openapi.yaml`, consumed by US-E24.1 / ADR 0075,
 * which supersedes the mock-first ADR 0073).
 *
 * **The double `lms` segment is deliberate.** Kong routes `/lms/api/v1` to
 * upstream `http://lms:3004/api/v1` with `strip_path`, and the service mounts
 * its own routes under `/api/v1/lms/...`. Through the gateway that composes to
 * `/lms/api/v1/lms/...`. Dropping either segment 404s.
 *
 * Query filters (`classId`, `subjectId`, `courseId`) are NOT baked into these
 * strings — they travel as axios `params` so the repository owns encoding and
 * a caller cannot accidentally build `?classId=undefined`. `classId` is
 * REQUIRED by both list endpoints.
 *
 * Separate from `LESSON_BANK_EP` (teacher-side authoring on `core`).
 */
const BASE = "/lms/api/v1/lms";
const enc = encodeURIComponent;

export const LMS_EP = {
  /** GET (`?classId=` required, `?subjectId=` optional) + POST (create). */
  courses: `${BASE}/courses`,
  /** GET (single, full `Course`) + PATCH (title/description). */
  course: (courseId: string) => `${BASE}/courses/${enc(courseId)}`,
  /** POST — DRAFT → PUBLISHED (terminal). */
  publishCourse: (courseId: string) =>
    `${BASE}/courses/${enc(courseId)}/publish`,
  /** GET (ordered `LessonSummary[]`, no content) + POST (create). */
  lessons: (courseId: string) => `${BASE}/courses/${enc(courseId)}/lessons`,
  /** GET (full `Lesson` incl. content) + PATCH + DELETE. */
  lesson: (courseId: string, lessonId: string) =>
    `${BASE}/courses/${enc(courseId)}/lessons/${enc(lessonId)}`,
  /** GET — the ordered course timeline (student-filtered server-side). */
  items: (courseId: string) => `${BASE}/courses/${enc(courseId)}/items`,
  /** POST — create a DOCUMENT item (the only client-creatable item kind). */
  itemDocuments: (courseId: string) =>
    `${BASE}/courses/${enc(courseId)}/items/documents`,
  /** PUT — replace the COMPLETE ordering (`{ itemIds }`). */
  itemsOrder: (courseId: string) =>
    `${BASE}/courses/${enc(courseId)}/items/order`,
  /** PATCH (window / DOCUMENT fields) + DELETE (DOCUMENT only). */
  item: (courseId: string, itemId: string) =>
    `${BASE}/courses/${enc(courseId)}/items/${enc(itemId)}`,
  /** GET (`?classId=` required, `?subjectId=`/`?courseId=` optional) + POST. */
  assignments: `${BASE}/assignments`,
  /** GET (full `Assignment` incl. instructions) + PATCH. */
  assignment: (assignmentId: string) =>
    `${BASE}/assignments/${enc(assignmentId)}`,
  /** POST (student submit, single attempt) + GET (teacher list, no content). */
  submissions: (assignmentId: string) =>
    `${BASE}/assignments/${enc(assignmentId)}/submissions`,
  /** GET — the caller's own submission, WITH content. 404 = not submitted. */
  mySubmission: (assignmentId: string) =>
    `${BASE}/assignments/${enc(assignmentId)}/submissions/me`,
  /** GET — one student's submission, WITH content (teacher or that student). */
  submission: (assignmentId: string, studentUserId: string) =>
    `${BASE}/assignments/${enc(assignmentId)}/submissions/${enc(studentUserId)}`,
} as const;

/**
 * core service — `exercisebank` sub-domain (teacher Question Bank, US-E11.9).
 * REAL (ground-truthed against the running `core` source this session), routed
 * through Kong (ADR 0030): `/core/api/v1/...` → Kong strips `/core` → core
 * receives `/api/v1/courseware/questions...`.
 *
 * Additive, per spec §6.1 — deliberately co-located here rather than a new
 * file. UNRELATED to `LMS_EP` above (a different service entirely) — do NOT
 * confuse or merge the two.
 */
export const QUESTION_BANK_EP = {
  search: "/core/api/v1/courseware/questions/search", // GET (cross-teacher PUBLISHED)
  list: "/core/api/v1/courseware/questions", // GET (own) / POST (create)
  detail: (id: string) => `/core/api/v1/courseware/questions/${id}`, // GET / PUT
  publish: (id: string) => `/core/api/v1/courseware/questions/${id}/publish`, // PUT
} as const;
