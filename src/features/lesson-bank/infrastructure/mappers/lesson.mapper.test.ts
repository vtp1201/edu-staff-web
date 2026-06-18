import { describe, expect, it } from "vitest";
import type { LessonResponseDto } from "../dtos/lesson-response.dto";
import { mapLesson, mapLessonList } from "./lesson.mapper";

const DTO: LessonResponseDto = {
  id: "l-1",
  title: "Toán đại số",
  description: "Mô tả bài giảng",
  subjectId: "sub-1",
  subjectName: "Toán",
  department: "Tổ Toán – Lý – Tin",
  fileType: "pdf",
  fileUrl: "https://cdn.example.com/file.pdf",
  thumbnailUrl: "https://cdn.example.com/thumb.jpg",
  visibility: "school",
  uploadedAt: "2026-06-18",
  authorId: "u-1",
  authorName: "GV Nguyễn A",
  viewCount: 42,
};

describe("mapLesson", () => {
  it("maps all fields from DTO to entity", () => {
    const entity = mapLesson(DTO);
    expect(entity).toEqual({
      id: "l-1",
      title: "Toán đại số",
      description: "Mô tả bài giảng",
      subjectId: "sub-1",
      subjectName: "Toán",
      department: "Tổ Toán – Lý – Tin",
      fileType: "pdf",
      fileUrl: "https://cdn.example.com/file.pdf",
      thumbnailUrl: "https://cdn.example.com/thumb.jpg",
      visibility: "school",
      uploadedAt: "2026-06-18",
      authorId: "u-1",
      authorName: "GV Nguyễn A",
      viewCount: 42,
    });
  });

  it("handles optional fields undefined", () => {
    const dto: LessonResponseDto = {
      ...DTO,
      description: undefined,
      thumbnailUrl: undefined,
      department: undefined,
    };
    const entity = mapLesson(dto);
    expect(entity.description).toBeUndefined();
    expect(entity.thumbnailUrl).toBeUndefined();
    expect(entity.department).toBeUndefined();
  });
});

describe("mapLessonList", () => {
  it("maps an array of DTOs", () => {
    const entities = mapLessonList([DTO, { ...DTO, id: "l-2" }]);
    expect(entities).toHaveLength(2);
    expect(entities[0].id).toBe("l-1");
    expect(entities[1].id).toBe("l-2");
  });

  it("returns empty array for empty input", () => {
    expect(mapLessonList([])).toEqual([]);
  });
});
