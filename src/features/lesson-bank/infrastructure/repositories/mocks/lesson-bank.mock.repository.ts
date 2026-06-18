import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  LessonEntity,
  LessonListFilter,
} from "../../../domain/entities/lesson.entity";
import type { UploadLessonInput } from "../../../domain/entities/upload-lesson-input.entity";
import type { ILessonBankRepository } from "../../../domain/repositories/i-lesson-bank.repository";
import { MOCK_LESSONS } from "./fixtures";

let store: LessonEntity[] = [...MOCK_LESSONS];
let idCounter = 100;

export class MockLessonBankRepository implements ILessonBankRepository {
  async listLessons(filter: LessonListFilter): Promise<LessonEntity[]> {
    await mockDelay(200);
    let items = [...store];

    if (filter.visibility) {
      items = items.filter((l) => l.visibility === filter.visibility);
    }
    if (filter.subjectId) {
      items = items.filter((l) => l.subjectId === filter.subjectId);
    }
    if (filter.department) {
      items = items.filter((l) => l.department === filter.department);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter((l) => l.title.toLowerCase().includes(q));
    }

    if (filter.sort === "most-viewed") {
      items.sort((a, b) => b.viewCount - a.viewCount);
    } else if (filter.sort === "title-asc") {
      items.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    } else {
      // default: newest
      items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    }

    return items;
  }

  async getLessonDetail(id: string): Promise<LessonEntity> {
    await mockDelay(150);
    const found = store.find((l) => l.id === id);
    if (!found) throw new Error("not-found");
    return { ...found };
  }

  async uploadLesson(input: UploadLessonInput): Promise<LessonEntity> {
    await mockDelay(400);
    idCounter += 1;
    const lesson: LessonEntity = {
      id: `l-mock-${idCounter}`,
      title: input.title,
      description: input.description,
      subjectId: input.subjectId,
      subjectName: "Môn học",
      department: input.department,
      fileType: input.fileType,
      fileUrl: input.linkUrl ?? `https://cdn.example.com/mock-${idCounter}`,
      visibility: input.visibility,
      uploadedAt: new Date().toISOString().slice(0, 10),
      authorId: "u-mock",
      authorName: "GV Mock",
      viewCount: 0,
    };
    store = [lesson, ...store];
    return { ...lesson };
  }

  async updateLesson(
    id: string,
    input: Partial<UploadLessonInput>,
  ): Promise<LessonEntity> {
    await mockDelay(300);
    const idx = store.findIndex((l) => l.id === id);
    if (idx < 0) throw new Error("not-found");
    const updated: LessonEntity = {
      ...store[idx],
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.subjectId !== undefined && { subjectId: input.subjectId }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.fileType !== undefined && { fileType: input.fileType }),
      ...(input.linkUrl !== undefined && { fileUrl: input.linkUrl }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
    };
    store = store.map((l, i) => (i === idx ? updated : l));
    return { ...updated };
  }

  async deleteLesson(id: string): Promise<void> {
    await mockDelay(200);
    const idx = store.findIndex((l) => l.id === id);
    if (idx < 0) throw new Error("not-found");
    store = store.filter((l) => l.id !== id);
  }
}
