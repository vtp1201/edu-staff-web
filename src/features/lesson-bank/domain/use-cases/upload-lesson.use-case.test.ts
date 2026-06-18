import { describe, expect, it, vi } from "vitest";
import type { LessonEntity } from "../entities/lesson.entity";
import type { UploadLessonInput } from "../entities/upload-lesson-input.entity";
import type { ILessonBankRepository } from "../repositories/i-lesson-bank.repository";
import { UploadLessonUseCase } from "./upload-lesson.use-case";

const STUB_LESSON: LessonEntity = {
  id: "l-1",
  title: "Toán đại số",
  subjectId: "sub-1",
  subjectName: "Toán",
  fileType: "pdf",
  fileUrl: "https://cdn.example.com/f.pdf",
  visibility: "private",
  uploadedAt: "2026-06-18",
  authorId: "u-1",
  authorName: "GV A",
  viewCount: 0,
};

function makeRepo(
  overrides: Partial<ILessonBankRepository> = {},
): ILessonBankRepository {
  return {
    listLessons: vi.fn(),
    getLessonDetail: vi.fn(),
    uploadLesson: vi.fn().mockResolvedValue(STUB_LESSON),
    updateLesson: vi.fn(),
    deleteLesson: vi.fn(),
    ...overrides,
  };
}

const VALID_INPUT: UploadLessonInput = {
  title: "Toán đại số",
  subjectId: "sub-1",
  fileType: "pdf",
  visibility: "private",
};

describe("UploadLessonUseCase", () => {
  it("ok — uploads and returns lesson", async () => {
    const repo = makeRepo();
    const uc = new UploadLessonUseCase(repo);
    const result = await uc.execute(VALID_INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lesson).toBe(STUB_LESSON);
    }
    expect(repo.uploadLesson).toHaveBeenCalledWith(VALID_INPUT);
  });

  it("missing-title — returns failure when title is empty", async () => {
    const repo = makeRepo();
    const uc = new UploadLessonUseCase(repo);
    const result = await uc.execute({ ...VALID_INPUT, title: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.type).toBe("missing-title");
    }
    expect(repo.uploadLesson).not.toHaveBeenCalled();
  });

  it("missing-title — returns failure when title is whitespace only", async () => {
    const repo = makeRepo();
    const uc = new UploadLessonUseCase(repo);
    const result = await uc.execute({ ...VALID_INPUT, title: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("missing-title");
  });

  it("invalid-url — returns failure for link type with bad URL", async () => {
    const repo = makeRepo();
    const uc = new UploadLessonUseCase(repo);
    const result = await uc.execute({
      ...VALID_INPUT,
      fileType: "link",
      linkUrl: "not-a-url",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("invalid-url");
    expect(repo.uploadLesson).not.toHaveBeenCalled();
  });

  it("invalid-url — returns failure for link type with no URL", async () => {
    const repo = makeRepo();
    const uc = new UploadLessonUseCase(repo);
    const result = await uc.execute({ ...VALID_INPUT, fileType: "link" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("invalid-url");
  });

  it("ok — link type with valid URL succeeds", async () => {
    const repo = makeRepo({
      uploadLesson: vi
        .fn()
        .mockResolvedValue({ ...STUB_LESSON, fileType: "link" }),
    });
    const uc = new UploadLessonUseCase(repo);
    const result = await uc.execute({
      ...VALID_INPUT,
      fileType: "link",
      linkUrl: "https://youtube.com/watch?v=abc",
    });
    expect(result.ok).toBe(true);
  });

  it("unsupported-type — returns failure for unknown file type", async () => {
    const repo = makeRepo();
    const uc = new UploadLessonUseCase(repo);
    const result = await uc.execute({
      ...VALID_INPUT,
      fileType: "docx" as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unsupported-type");
  });

  it("file-too-large — returns failure when file exceeds 50MB", async () => {
    const repo = makeRepo();
    const uc = new UploadLessonUseCase(repo);
    const bigFile = { size: 51 * 1024 * 1024 } as File;
    const result = await uc.execute({ ...VALID_INPUT, file: bigFile });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("file-too-large");
    expect(repo.uploadLesson).not.toHaveBeenCalled();
  });

  it("unknown — wraps repo error as unknown failure", async () => {
    const repo = makeRepo({
      uploadLesson: vi.fn().mockRejectedValue(new Error("server error")),
    });
    const uc = new UploadLessonUseCase(repo);
    const result = await uc.execute(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.type).toBe("unknown");
    }
  });
});
