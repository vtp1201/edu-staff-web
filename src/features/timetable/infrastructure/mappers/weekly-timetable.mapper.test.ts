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

  it("colours every subject in the week, one colour per subject", () => {
    const tt = mapWeeklyTimetable(DTO);
    const bySubject = new Map<string, Set<string>>();
    for (const periods of Object.values(tt.slots)) {
      for (const slot of Object.values(periods)) {
        if (!slot) continue;
        const seen = bySubject.get(slot.subjectId) ?? new Set<string>();
        seen.add(slot.subjectColorToken);
        bySubject.set(slot.subjectId, seen);
      }
    }
    // one subject → exactly one colour, and never the grey fallback
    for (const [, tokens] of bySubject) {
      expect(tokens.size).toBe(1);
      expect([...tokens][0]).not.toBe("muted");
    }
    // distinct subjects → distinct colours (this week has ≤ palette size)
    const used = [...bySubject.values()].map((s) => [...s][0]);
    expect(new Set(used).size).toBe(bySubject.size);
  });

  it("colours an unrecognised subjectId too (no grey fallback)", () => {
    const tt = mapWeeklyTimetable({
      classId: "x",
      className: "x",
      slots: { "0": { "1": { subjectId: "unknown", subjectName: "?" } } },
    });
    expect(tt.slots[0][1]?.subjectColorToken).not.toBe("muted");
  });
});
