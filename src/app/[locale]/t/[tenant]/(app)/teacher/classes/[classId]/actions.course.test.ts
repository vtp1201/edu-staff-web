/**
 * Server Action tests — class-hub COURSE tab (US-E24.10, HIGH-RISK lane).
 *
 * The security block is the point of this file. Every one of the seven
 * mutations is called DIRECTLY (no UI, no client state) with a course whose
 * subject the caller does not teach, and each is asserted to (a) answer
 * `forbidden` and (b) never reach the use-case at all — a returned error with
 * the write already sent would be a silently exploited gate.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getMyClass = vi.fn();
vi.mock("@/bootstrap/di/teacher-class.di", () => ({
  makeGetMyClassUseCase: vi.fn(async () => ({ execute: getMyClass })),
}));

const getCourse = vi.fn();
const listItems = vi.fn();
const reorderItems = vi.fn();
const patchItem = vi.fn();
const createLesson = vi.fn();
const createAssignment = vi.fn();
const addDocumentItem = vi.fn();
const publishCourse = vi.fn();
const deleteItem = vi.fn();

vi.mock("@/bootstrap/di/lms.di", () => ({
  makeGetCourseUseCase: vi.fn(async () => ({ execute: getCourse })),
  makeListCourseItemsUseCase: vi.fn(async () => ({ execute: listItems })),
  makeReorderItemsUseCase: vi.fn(async () => ({ execute: reorderItems })),
  makePatchItemUseCase: vi.fn(async () => ({ execute: patchItem })),
  makeCreateLessonUseCase: vi.fn(async () => ({ execute: createLesson })),
  makeCreateAssignmentUseCase: vi.fn(async () => ({
    execute: createAssignment,
  })),
  makeAddDocumentItemUseCase: vi.fn(async () => ({ execute: addDocumentItem })),
  makePublishCourseUseCase: vi.fn(async () => ({ execute: publishCourse })),
  makeDeleteItemUseCase: vi.fn(async () => ({ execute: deleteItem })),
}));

// Unrelated to this tab, but `actions.ts` is one module: its other actions'
// dependencies must still resolve for the file to import.
vi.mock("@/bootstrap/di/period-log.di", () => ({
  makeSavePeriodLogUseCase: vi.fn(),
  makeDeletePeriodLogUseCase: vi.fn(),
  makeSavePeriodPrepUseCase: vi.fn(),
  makeDeletePeriodPrepUseCase: vi.fn(),
}));
vi.mock("@/bootstrap/di/discipline.di", () => ({
  makeDecideLeaveUseCases: vi.fn(),
}));
vi.mock("../../class-log/actions", () => ({
  createEntryAction: vi.fn(),
  submitEntryAction: vi.fn(),
  reviseEntryAction: vi.fn(),
}));
vi.mock("@/bootstrap/lib/resolve-current-term", () => ({
  resolveCurrentTermContext: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  addDocumentItemAction,
  createAssignmentAction,
  createLessonAction,
  deleteItemAction,
  listCourseItemsAction,
  patchItemAction,
  publishCourseAction,
  reorderItemsAction,
} from "./actions";

/** The caller teaches Toán in c-1, and is also its GVCN. */
const MY_CLASS = {
  ok: true,
  data: {
    id: "c-1",
    roles: ["homeroom", "subject"],
    subjects: [{ id: "sub-toan", name: "Toán" }],
  },
};

const MY_COURSE = {
  ok: true,
  data: {
    id: "co-1",
    classId: "c-1",
    subjectId: "sub-toan",
    title: "Toán 10",
    status: "DRAFT",
  },
};

/** Same class, a colleague's subject — what a GVCN sees in readonly mode. */
const FOREIGN_COURSE = {
  ok: true,
  data: { ...MY_COURSE.data, id: "co-2", subjectId: "sub-ly" },
};

const ITEM = { id: "i-1", courseId: "co-1", itemType: "DOCUMENT" };

beforeEach(() => {
  vi.clearAllMocks();
  getMyClass.mockResolvedValue(MY_CLASS);
  getCourse.mockResolvedValue(MY_COURSE);
  listItems.mockResolvedValue({ ok: true, data: [ITEM] });
});

describe("listCourseItemsAction (the read a readonly GVCN needs)", () => {
  it("lets a GVCN read a colleague's course in their own class", async () => {
    getCourse.mockResolvedValue(FOREIGN_COURSE);

    expect(await listCourseItemsAction("c-1", "co-2")).toEqual({
      ok: true,
      data: [ITEM],
    });
  });

  it("refuses a course belonging to ANOTHER class, whatever its id", async () => {
    getCourse.mockResolvedValue({
      ok: true,
      data: { ...MY_COURSE.data, classId: "c-999" },
    });

    expect(await listCourseItemsAction("c-1", "co-1")).toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(listItems).not.toHaveBeenCalled();
  });
});

describe("reorderItemsAction", () => {
  it("forwards the COMPLETE ordering and revalidates on success", async () => {
    const { revalidatePath } = await import("next/cache");
    reorderItems.mockResolvedValue({ ok: true, data: [ITEM] });

    const res = await reorderItemsAction("c-1", "co-1", ["i-2", "i-1"]);

    expect(reorderItems).toHaveBeenCalledWith("co-1", ["i-2", "i-1"]);
    expect(res).toEqual({ ok: true, data: [ITEM] });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("returns the stable failure key and does NOT revalidate on a drifted id set", async () => {
    const { revalidatePath } = await import("next/cache");
    reorderItems.mockResolvedValue({
      ok: false,
      failure: { type: "not-found" },
    });

    expect(await reorderItemsAction("c-1", "co-1", ["i-1"])).toEqual({
      ok: false,
      errorKey: "not-found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("patchItemAction", () => {
  it("forwards the three-state patch verbatim (an explicit null CLEARS)", async () => {
    patchItem.mockResolvedValue({ ok: true, data: ITEM });

    await patchItemAction("c-1", "co-1", "i-1", { startAt: null, dueAt: "x" });

    expect(patchItem).toHaveBeenCalledWith("co-1", "i-1", {
      startAt: null,
      dueAt: "x",
    });
  });

  it("passes an EXAM refusal through untranslated", async () => {
    patchItem.mockResolvedValue({
      ok: false,
      failure: { type: "exam-window-not-editable" },
    });

    expect(await patchItemAction("c-1", "co-1", "i-1", {})).toEqual({
      ok: false,
      errorKey: "exam-window-not-editable",
    });
  });
});

describe("the three create actions", () => {
  it("answers with the whole re-read timeline, not the created entity", async () => {
    createLesson.mockResolvedValue({ ok: true, data: { id: "le-9" } });
    listItems.mockResolvedValue({ ok: true, data: [ITEM, { id: "le-9" }] });

    const res = await createLessonAction("c-1", "co-1", {
      title: "Bài 1",
      content: "x",
    });

    expect(res).toEqual({ ok: true, data: [ITEM, { id: "le-9" }] });
  });

  it("takes classId/subjectId for an assignment from the SERVER's course read", async () => {
    createAssignment.mockResolvedValue({ ok: true, data: { id: "as-9" } });

    await createAssignmentAction("c-1", "co-1", { title: "Bài tập" });

    expect(createAssignment).toHaveBeenCalledWith({
      classId: "c-1",
      subjectId: "sub-toan",
      courseId: "co-1",
      title: "Bài tập",
    });
  });

  it("surfaces a DRAFT-course assignment refusal as its own actionable key", async () => {
    createAssignment.mockResolvedValue({
      ok: false,
      failure: { type: "course-not-published" },
    });

    expect(await createAssignmentAction("c-1", "co-1", { title: "x" })).toEqual(
      { ok: false, errorKey: "course-not-published" },
    );
  });

  it("surfaces BE's url rejection for a document", async () => {
    addDocumentItem.mockResolvedValue({
      ok: false,
      failure: { type: "invalid-url" },
    });

    expect(
      await addDocumentItemAction("c-1", "co-1", {
        title: "x",
        url: "https://x.test",
      }),
    ).toEqual({ ok: false, errorKey: "invalid-url" });
  });
});

describe("publishCourseAction", () => {
  it("returns only the new status — a publish changes nothing else", async () => {
    publishCourse.mockResolvedValue({
      ok: true,
      data: { ...MY_COURSE.data, status: "PUBLISHED" },
    });

    expect(await publishCourseAction("c-1", "co-1")).toEqual({
      ok: true,
      data: "PUBLISHED",
    });
  });

  it("passes a second publish through as `already-published`", async () => {
    publishCourse.mockResolvedValue({
      ok: false,
      failure: { type: "already-published" },
    });

    expect(await publishCourseAction("c-1", "co-1")).toEqual({
      ok: false,
      errorKey: "already-published",
    });
  });
});

describe("deleteItemAction", () => {
  it("passes the DOCUMENT-only refusal through", async () => {
    deleteItem.mockResolvedValue({
      ok: false,
      failure: { type: "not-document" },
    });

    expect(await deleteItemAction("c-1", "co-1", "i-1")).toEqual({
      ok: false,
      errorKey: "not-document",
    });
  });
});

/* ── SECURITY: the subject-ownership gate (decision 0063) ─────────────────── */

describe("a teacher who does not teach the course's subject", () => {
  /** Each entry calls one action; the mock it must NEVER reach comes with it. */
  const CALLS: ReadonlyArray<
    [string, () => Promise<unknown>, ReturnType<typeof vi.fn>]
  > = [
    [
      "reorderItems",
      () => reorderItemsAction("c-1", "co-2", ["i-1"]),
      reorderItems,
    ],
    ["patchItem", () => patchItemAction("c-1", "co-2", "i-1", {}), patchItem],
    [
      "createLesson",
      () => createLessonAction("c-1", "co-2", { title: "x", content: "y" }),
      createLesson,
    ],
    [
      "createAssignment",
      () => createAssignmentAction("c-1", "co-2", { title: "x" }),
      createAssignment,
    ],
    [
      "addDocumentItem",
      () =>
        addDocumentItemAction("c-1", "co-2", {
          title: "x",
          url: "https://x.test",
        }),
      addDocumentItem,
    ],
    ["publishCourse", () => publishCourseAction("c-1", "co-2"), publishCourse],
    ["deleteItem", () => deleteItemAction("c-1", "co-2", "i-1"), deleteItem],
  ];

  it.each(
    CALLS,
  )("%s is refused WITHOUT calling the use-case", async (_name, call, useCase) => {
    // The readonly case: same class, a subject the caller does not teach.
    getCourse.mockResolvedValue(FOREIGN_COURSE);

    expect(await call()).toEqual({ ok: false, errorKey: "forbidden" });
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each(
    CALLS,
  )("%s is refused when the class itself is not the caller's", async (_name, call, useCase) => {
    getMyClass.mockResolvedValue({ ok: false, error: { type: "not-found" } });

    expect(await call()).toEqual({ ok: false, errorKey: "forbidden" });
    expect(useCase).not.toHaveBeenCalled();
  });

  it("cannot mutate a course from another class by forging its id", async () => {
    getCourse.mockResolvedValue({
      ok: true,
      // Right subject, WRONG class — the cross-class hole a subject-only check
      // would leave open.
      data: { ...MY_COURSE.data, classId: "c-999", subjectId: "sub-toan" },
    });

    expect(await deleteItemAction("c-1", "co-1", "i-1")).toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(deleteItem).not.toHaveBeenCalled();
  });
});
