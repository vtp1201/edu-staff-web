import { describe, expect, it } from "vitest";
import type { TeachingPlanResponseDto } from "../dtos/teaching-plan-response.dto";
import { mapToTeachingPlan } from "./teaching-plan.mapper";

const dto: TeachingPlanResponseDto = {
  id: "plan-1",
  subjectId: "sub-toan",
  classId: "cls-10a",
  term: "HKI",
  status: "DRAFT",
  teacherMemberId: "m-1",
  weeks: 35,
  periodsPerWeek: 3,
  cells: [
    {
      week: 1,
      period: 1,
      title: "Đạo hàm",
      learningObjective: "Hiểu khái niệm",
    },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

describe("mapToTeachingPlan", () => {
  it("maps every wire field to the entity", () => {
    const entity = mapToTeachingPlan(dto);

    expect(entity.id).toBe("plan-1");
    expect(entity.status).toBe("DRAFT");
    expect(entity.weeks).toBe(35);
    expect(entity.periodsPerWeek).toBe(3);
    expect(entity.cells).toHaveLength(1);
    expect(entity.cells[0]).toEqual({
      week: 1,
      period: 1,
      title: "Đạo hàm",
      learningObjective: "Hiểu khái niệm",
      notes: undefined,
    });
  });

  it("defaults cells to an empty array when omitted", () => {
    const entity = mapToTeachingPlan({
      ...dto,
      cells: undefined as unknown as TeachingPlanResponseDto["cells"],
    });
    expect(entity.cells).toEqual([]);
  });

  it("carries rejectionReason when present", () => {
    const entity = mapToTeachingPlan({
      ...dto,
      status: "REJECTED",
      rejectionReason: "Chưa đủ nội dung",
    });
    expect(entity.rejectionReason).toBe("Chưa đủ nội dung");
  });
});
