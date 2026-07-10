import { describe, expect, it } from "vitest";
import type { WeeklyTimetableResponseDto } from "../dtos/weekly-timetable-response.dto";
import { mapWeeklyTimetable } from "./weekly-timetable.mapper";

const DTO: WeeklyTimetableResponseDto = {
  classId: "11A2",
  className: "11A2",
  slots: {
    "0": {
      "1": {
        subjectId: "math",
        subjectName: "Toán",
        teacherName: "Cô Nguyễn Thị Hương",
        room: "P.302",
      },
      "2": null,
    },
    "2": {
      "3": { subjectId: "geo", subjectName: "Địa lý", teacherName: "Cô Trang" },
    },
  },
};

describe("mapWeeklyTimetable", () => {
  it("maps identity fields and preserves the day/period nesting", () => {
    const tt = mapWeeklyTimetable(DTO);
    expect(tt.classId).toBe("11A2");
    expect(tt.slots[0][1]?.subjectName).toBe("Toán");
    expect(tt.slots[0][1]?.teacherName).toBe("Cô Nguyễn Thị Hương");
    expect(tt.slots[0][1]?.room).toBe("P.302");
    expect(tt.slots[0][2]).toBeNull();
  });

  it("resolves the subject color token from subjectId", () => {
    const tt = mapWeeklyTimetable(DTO);
    expect(tt.slots[0][1]?.subjectColorToken).toBe("primary");
  });

  it("maps the Địa lý placeholder token (pending dedicated-token ADR)", () => {
    const tt = mapWeeklyTimetable(DTO);
    expect(tt.slots[2][3]?.subjectColorToken).toBe("geo");
  });

  it("falls back to the muted token for an unknown subjectId", () => {
    const tt = mapWeeklyTimetable({
      classId: "x",
      className: "x",
      slots: { "0": { "1": { subjectId: "unknown", subjectName: "?" } } },
    });
    expect(tt.slots[0][1]?.subjectColorToken).toBe("muted");
  });
});
