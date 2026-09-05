/**
 * The seven teacher mutation use-cases (US-E24.10). Each is a thin orchestration
 * over `ILmsRepository` whose ONE job is to turn a thrown `LmsFailure` into a
 * `Result` — proven here per method, because a swallowed failure on a WRITE is
 * indistinguishable from a successful write at the call site.
 */
import { describe, expect, it, vi } from "vitest";
import type { Course } from "../../entities/course.entity";
import type { CourseItem } from "../../entities/course-item.entity";
import type { LmsFailure } from "../../failures/lms.failure";
import type { ILmsRepository } from "../../repositories/i-lms.repository";
import { AddDocumentItemUseCase } from "../add-document-item.use-case";
import { CreateAssignmentUseCase } from "../create-assignment.use-case";
import { CreateLessonUseCase } from "../create-lesson.use-case";
import { DeleteItemUseCase } from "../delete-item.use-case";
import { PatchItemUseCase } from "../patch-item.use-case";
import { PublishCourseUseCase } from "../publish-course.use-case";
import { ReorderItemsUseCase } from "../reorder-items.use-case";

const ITEM: CourseItem = {
  id: "i1",
  courseId: "c1",
  itemType: "DOCUMENT",
  refId: null,
  title: "Tài liệu",
  description: null,
  url: "https://example.org/a.pdf",
  position: 0,
  startAt: null,
  dueAt: null,
  state: "OPEN",
  createdBy: "t1",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  exam: null,
};

const COURSE: Course = {
  id: "c1",
  classId: "cl1",
  subjectId: "s1",
  title: "Toán 10",
  description: "",
  status: "PUBLISHED",
  isDefault: true,
  createdBy: "t1",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-02T00:00:00Z",
  publishedAt: "2026-08-02T00:00:00Z",
};

function repo(overrides: Partial<ILmsRepository>): ILmsRepository {
  return overrides as ILmsRepository;
}

function throwing(failure: LmsFailure["type"]) {
  return vi.fn(async () => {
    throw { type: failure } satisfies LmsFailure;
  });
}

describe("ReorderItemsUseCase", () => {
  it("forwards the COMPLETE ordering verbatim and returns the new timeline", async () => {
    const reorderItems = vi.fn(async () => [ITEM]);
    const result = await new ReorderItemsUseCase(
      repo({ reorderItems }),
    ).execute("c1", ["i2", "i1"]);

    expect(reorderItems).toHaveBeenCalledWith("c1", ["i2", "i1"]);
    expect(result).toEqual({ ok: true, data: [ITEM] });
  });

  it("surfaces a drifted id-set as `not-found`, not as a silent success", async () => {
    const result = await new ReorderItemsUseCase(
      repo({ reorderItems: throwing("not-found") }),
    ).execute("c1", ["i1"]);

    expect(result).toEqual({ ok: false, failure: { type: "not-found" } });
  });
});

describe("PatchItemUseCase", () => {
  it("forwards the three-state patch object untouched (an explicit null CLEARS)", async () => {
    const patchItem = vi.fn(async () => ITEM);
    await new PatchItemUseCase(repo({ patchItem })).execute("c1", "i1", {
      startAt: null,
      dueAt: "2026-09-01T00:00:00Z",
    });

    expect(patchItem).toHaveBeenCalledWith("c1", "i1", {
      startAt: null,
      dueAt: "2026-09-01T00:00:00Z",
    });
  });

  it("keeps the EXAM refusal as its own key", async () => {
    const result = await new PatchItemUseCase(
      repo({ patchItem: throwing("exam-window-not-editable") }),
    ).execute("c1", "i1", { dueAt: null });

    expect(result).toEqual({
      ok: false,
      failure: { type: "exam-window-not-editable" },
    });
  });

  it("keeps the inverted-window refusal as its own key", async () => {
    const result = await new PatchItemUseCase(
      repo({ patchItem: throwing("invalid-window") }),
    ).execute("c1", "i1", { dueAt: "2020-01-01T00:00:00Z" });

    expect(result).toEqual({ ok: false, failure: { type: "invalid-window" } });
  });
});

describe("CreateLessonUseCase", () => {
  it("delegates and wraps the created lesson", async () => {
    const createLesson = vi.fn(async () => ({
      id: "le1",
      courseId: "c1",
      title: "Bài 1",
      content: "x",
      position: 0,
      startAt: null,
      dueAt: null,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    }));
    const result = await new CreateLessonUseCase(
      repo({ createLesson }),
    ).execute("c1", { title: "Bài 1", content: "x" });

    expect(createLesson).toHaveBeenCalledWith("c1", {
      title: "Bài 1",
      content: "x",
    });
    expect(result.ok).toBe(true);
  });

  it("surfaces the per-course lesson cap", async () => {
    const result = await new CreateLessonUseCase(
      repo({ createLesson: throwing("limit-exceeded") }),
    ).execute("c1", { title: "x", content: "y" });

    expect(result).toEqual({ ok: false, failure: { type: "limit-exceeded" } });
  });
});

describe("CreateAssignmentUseCase", () => {
  it("delegates the whole body (classId/subjectId/courseId are required)", async () => {
    const createAssignment = vi.fn(async () => ({
      id: "as1",
      classId: "cl1",
      subjectId: "s1",
      courseId: "c1",
      title: "Bài tập",
      instructions: null,
      startAt: null,
      dueAt: null,
      state: "OPEN" as const,
      createdBy: "t1",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    }));
    await new CreateAssignmentUseCase(repo({ createAssignment })).execute({
      classId: "cl1",
      subjectId: "s1",
      courseId: "c1",
      title: "Bài tập",
    });

    expect(createAssignment).toHaveBeenCalledWith({
      classId: "cl1",
      subjectId: "s1",
      courseId: "c1",
      title: "Bài tập",
    });
  });

  it("surfaces a DRAFT course as `course-not-published` (actionable, not unknown)", async () => {
    const result = await new CreateAssignmentUseCase(
      repo({ createAssignment: throwing("course-not-published") }),
    ).execute({
      classId: "cl1",
      subjectId: "s1",
      courseId: "c1",
      title: "x",
    });

    expect(result).toEqual({
      ok: false,
      failure: { type: "course-not-published" },
    });
  });
});

describe("AddDocumentItemUseCase", () => {
  it("delegates and wraps the created item", async () => {
    const addDocumentItem = vi.fn(async () => ITEM);
    const result = await new AddDocumentItemUseCase(
      repo({ addDocumentItem }),
    ).execute("c1", { title: "Tài liệu", url: "https://example.org/a.pdf" });

    expect(addDocumentItem).toHaveBeenCalledWith("c1", {
      title: "Tài liệu",
      url: "https://example.org/a.pdf",
    });
    expect(result).toEqual({ ok: true, data: ITEM });
  });

  it("surfaces BE's url rejection even though the client pre-checks it", async () => {
    const result = await new AddDocumentItemUseCase(
      repo({ addDocumentItem: throwing("invalid-url") }),
    ).execute("c1", { title: "x", url: "https://ok.example" });

    expect(result).toEqual({ ok: false, failure: { type: "invalid-url" } });
  });
});

describe("PublishCourseUseCase", () => {
  it("returns the PUBLISHED course so the banner needs no second read", async () => {
    const publishCourse = vi.fn(async () => COURSE);
    const result = await new PublishCourseUseCase(
      repo({ publishCourse }),
    ).execute("c1");

    expect(publishCourse).toHaveBeenCalledWith("c1");
    expect(result).toEqual({ ok: true, data: COURSE });
  });

  it("maps a second publish to `already-published` (409, terminal transition)", async () => {
    const result = await new PublishCourseUseCase(
      repo({ publishCourse: throwing("already-published") }),
    ).execute("c1");

    expect(result).toEqual({
      ok: false,
      failure: { type: "already-published" },
    });
  });
});

describe("DeleteItemUseCase", () => {
  it("deletes and resolves with no payload", async () => {
    const deleteItem = vi.fn(async () => undefined);
    const result = await new DeleteItemUseCase(repo({ deleteItem })).execute(
      "c1",
      "i1",
    );

    expect(deleteItem).toHaveBeenCalledWith("c1", "i1");
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("keeps the DOCUMENT-only refusal as its own key", async () => {
    const result = await new DeleteItemUseCase(
      repo({ deleteItem: throwing("not-document") }),
    ).execute("c1", "i1");

    expect(result).toEqual({ ok: false, failure: { type: "not-document" } });
  });
});
