import { describe, expect, it } from "vitest";
import type { LessonPlanResponseDto } from "../dtos/lesson-plan-response.dto";
import { mapLessonPlan } from "./lesson-plan.mapper";

const base: LessonPlanResponseDto = {
  planId: "lp-1",
  teacherId: "t-1",
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "Giáo án — Đạo hàm",
  objectives: "o",
  contentOutline: "c",
  activities: "a",
  assessmentMethod: "m",
  status: "PUBLISHED",
  tags: ["Chương 5"],
  publishedAt: "2026-05-18T00:00:00Z",
  createdAt: "2026-05-10T00:00:00Z",
  updatedAt: "2026-05-18T00:00:00Z",
};

describe("mapLessonPlan", () => {
  it("maps every field 1:1 including publishedAt when present", () => {
    expect(mapLessonPlan(base)).toEqual({
      planId: "lp-1",
      teacherId: "t-1",
      subjectId: "sub-math",
      gradeLevel: "11",
      title: "Giáo án — Đạo hàm",
      objectives: "o",
      contentOutline: "c",
      activities: "a",
      assessmentMethod: "m",
      status: "PUBLISHED",
      tags: ["Chương 5"],
      publishedAt: "2026-05-18T00:00:00Z",
      createdAt: "2026-05-10T00:00:00Z",
      updatedAt: "2026-05-18T00:00:00Z",
    });
  });

  it("leaves publishedAt undefined when the wire omits the key (DRAFT)", () => {
    const { publishedAt: _omit, ...draftDto } = { ...base, status: "DRAFT" };
    const entity = mapLessonPlan(draftDto as LessonPlanResponseDto);
    expect(entity.publishedAt).toBeUndefined();
    expect("publishedAt" in entity).toBe(true); // key exists on entity but value is undefined
  });

  it("treats an empty-string publishedAt as undefined (not a false 'published')", () => {
    const entity = mapLessonPlan({ ...base, status: "DRAFT", publishedAt: "" });
    expect(entity.publishedAt).toBeUndefined();
  });

  it("normalizes a missing tags key to []", () => {
    const { tags: _t, ...noTags } = base;
    const entity = mapLessonPlan(noTags as LessonPlanResponseDto);
    expect(entity.tags).toEqual([]);
  });
});
