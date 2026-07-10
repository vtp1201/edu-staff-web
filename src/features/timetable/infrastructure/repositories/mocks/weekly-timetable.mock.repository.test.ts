import { describe, expect, it } from "vitest";
import type { TimetableViewFailure } from "../../../domain/failures/timetable-view.failure";
import { MockWeeklyTimetableRepository } from "./weekly-timetable.mock.repository";

describe("MockWeeklyTimetableRepository", () => {
  it("getByClass('11A2') returns the full-week timetable with resolved colors", async () => {
    const repo = new MockWeeklyTimetableRepository();
    const tt = await repo.getByClass("11A2");
    expect(tt.classId).toBe("11A2");
    expect(tt.slots[0][1]?.subjectName).toBe("Toán");
    expect(tt.slots[0][1]?.subjectColorToken).toBe("primary");
    // empty period rendered as an explicit null (not undefined)
    expect(tt.slots[0][6]).toBeNull();
    // Saturday is a half-day
    expect(tt.slots[5][2]?.subjectId).toBe("pe");
    expect(tt.slots[5][3]).toBeNull();
  });

  it("getByClass('8B1') returns the sparser week (no Saturday sessions)", async () => {
    const repo = new MockWeeklyTimetableRepository();
    const tt = await repo.getByClass("8B1");
    expect(tt.classId).toBe("8B1");
    expect(tt.slots[0][1]?.subjectName).toBe("Toán");
    expect(tt.slots[2][3]?.subjectId).toBe("math");
    // no Sat sessions at all
    const satFilled = Object.values(tt.slots[5]).filter(Boolean);
    expect(satFilled).toHaveLength(0);
  });

  it("getByClass(unknown) throws a not-found failure (empty-state trigger)", async () => {
    const repo = new MockWeeklyTimetableRepository();
    await expect(repo.getByClass("ZZZ")).rejects.toEqual({
      type: "not-found",
    } satisfies TimetableViewFailure);
  });

  it("getMyTimetable resolves the signed-in student's class (11A2)", async () => {
    const repo = new MockWeeklyTimetableRepository();
    const tt = await repo.getMyTimetable();
    expect(tt.classId).toBe("11A2");
  });

  it("getChildren returns the fixed 2-child roster", async () => {
    const repo = new MockWeeklyTimetableRepository();
    const children = await repo.getChildren();
    expect(children).toHaveLength(2);
    expect(children[0].childId).toBe("c1");
    expect(children[0].color).toBe("primary");
    expect(children[1].className).toBe("8B1");
  });
});
