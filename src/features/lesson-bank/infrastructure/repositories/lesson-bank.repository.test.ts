import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { LESSON_BANK_EP } from "@/bootstrap/endpoint/lesson-bank.endpoint";
import { LessonBankRepository } from "./lesson-bank.repository";

function makeHttp(overrides: Partial<AxiosInstance> = {}): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as AxiosInstance;
}

const DTO_LIST = [
  {
    id: "l-1",
    title: "Toán",
    subjectId: "sub-1",
    subjectName: "Toán",
    fileType: "pdf",
    fileUrl: "https://cdn.example.com/f.pdf",
    visibility: "school",
    uploadedAt: "2026-06-18",
    authorId: "u-1",
    authorName: "GV A",
    viewCount: 5,
  },
];

describe("LessonBankRepository", () => {
  it("listLessons — calls correct endpoint and maps result", async () => {
    const http = makeHttp({ get: vi.fn().mockResolvedValue(DTO_LIST) });
    const repo = new LessonBankRepository(http);
    const filter = { subjectId: "sub-1", sort: "newest" as const };
    const lessons = await repo.listLessons(filter);
    expect(http.get).toHaveBeenCalledWith(LESSON_BANK_EP.list, {
      params: {
        subjectId: "sub-1",
        department: undefined,
        visibility: undefined,
        search: undefined,
        sort: "newest",
      },
    });
    expect(lessons).toHaveLength(1);
    expect(lessons[0].id).toBe("l-1");
  });

  it("getLessonDetail — calls detail endpoint and maps single DTO", async () => {
    const http = makeHttp({ get: vi.fn().mockResolvedValue(DTO_LIST[0]) });
    const repo = new LessonBankRepository(http);
    const lesson = await repo.getLessonDetail("l-1");
    expect(http.get).toHaveBeenCalledWith(LESSON_BANK_EP.detail("l-1"));
    expect(lesson.id).toBe("l-1");
  });

  it("uploadLesson — posts body and maps response", async () => {
    const http = makeHttp({ post: vi.fn().mockResolvedValue(DTO_LIST[0]) });
    const repo = new LessonBankRepository(http);
    const lesson = await repo.uploadLesson({
      title: "Toán",
      subjectId: "sub-1",
      fileType: "pdf",
      visibility: "school",
    });
    expect(http.post).toHaveBeenCalledWith(
      LESSON_BANK_EP.upload,
      expect.objectContaining({
        title: "Toán",
        fileType: "pdf",
      }),
    );
    expect(lesson.id).toBe("l-1");
  });

  it("deleteLesson — calls delete endpoint", async () => {
    const http = makeHttp({ delete: vi.fn().mockResolvedValue(undefined) });
    const repo = new LessonBankRepository(http);
    await repo.deleteLesson("l-1");
    expect(http.delete).toHaveBeenCalledWith(LESSON_BANK_EP.delete("l-1"));
  });

  it("updateLesson — calls put endpoint and maps response", async () => {
    const http = makeHttp({ put: vi.fn().mockResolvedValue(DTO_LIST[0]) });
    const repo = new LessonBankRepository(http);
    const lesson = await repo.updateLesson("l-1", { title: "Updated" });
    expect(http.put).toHaveBeenCalledWith(
      LESSON_BANK_EP.update("l-1"),
      expect.objectContaining({ title: "Updated" }),
    );
    expect(lesson.id).toBe("l-1");
  });
});
