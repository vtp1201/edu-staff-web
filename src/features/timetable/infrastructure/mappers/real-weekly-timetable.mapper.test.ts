import { describe, expect, it } from "vitest";
import type { RealTimetableResponseDto } from "../dtos/real-timetable-response.dto";
import { mapRealWeeklyTimetable } from "./real-weekly-timetable.mapper";

describe("mapRealWeeklyTimetable", () => {
  const DTO: RealTimetableResponseDto = {
    classId: "cls-1",
    termId: "term-1",
    slots: [
      {
        day: "MON",
        period: 1,
        subjectId: "sub-uuid",
        teacherMemberId: "tch-uuid",
      },
      { day: "FRI", period: 5, subjectId: "sub-2", teacherMemberId: "tch-2" },
    ],
  };

  it("joins the day enum to a 0-indexed day and nests by [day][period]", () => {
    const vm = mapRealWeeklyTimetable(DTO, "11A2");
    expect(vm.classId).toBe("cls-1");
    expect(vm.className).toBe("11A2");
    expect(vm.slots[0]?.[1]?.subjectId).toBe("sub-uuid");
    expect(vm.slots[4]?.[5]?.subjectId).toBe("sub-2");
  });

  it("falls back to the raw id for subject/teacher display names (no wire names — ask #6/#7)", () => {
    const vm = mapRealWeeklyTimetable(DTO, "11A2");
    const slot = vm.slots[0]?.[1];
    expect(slot?.subjectName).toBe("sub-uuid");
    expect(slot?.teacherName).toBe("tch-uuid");
    expect(slot?.room).toBeUndefined();
  });

  it("defaults the color token to muted for an unrecognised (real UUID) subjectId", () => {
    const vm = mapRealWeeklyTimetable(DTO, "11A2");
    expect(vm.slots[0]?.[1]?.subjectColorToken).toBe("muted");
  });
});
