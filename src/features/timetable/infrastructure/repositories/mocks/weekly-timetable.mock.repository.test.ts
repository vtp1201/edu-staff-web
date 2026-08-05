import { describe, expect, it } from "vitest";
import type { TimetableViewFailure } from "../../../domain/failures/timetable-view.failure";
import { teacherScheduleDtoFor } from "./fixtures";
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

  it("getByTeacher returns the teacher's own schedule spanning multiple classes", async () => {
    const repo = new MockWeeklyTimetableRepository();
    const tt = await repo.getByTeacher();
    // top-level identity is the teacher (documented reuse of the class shape)
    expect(tt.className).toBe("Cô Nguyễn Thị Hương");
    // per-slot className marks the class taught that period (teacher variant)
    expect(tt.slots[0][1]?.subjectName).toBe("Toán");
    expect(tt.slots[0][1]?.className).toBe("11A2");
    expect(tt.slots[0][1]?.subjectColorToken).toBe("primary");
    // same teacher, different class in another period → cross-class week
    expect(tt.slots[0][4]?.className).toBe("8B1");
    expect(tt.slots[0][7]?.className).toBe("10C3");
    // free period rendered as explicit null
    expect(tt.slots[0][3]).toBeNull();
  });

  it("teacherScheduleDtoFor(unknown) returns null (the not-found empty-state trigger)", () => {
    expect(teacherScheduleDtoFor("ghost-teacher")).toBeNull();
  });

  /*
   * US-E15.3 fix round: in mock/demo mode the principal screen's teacher picker
   * is only meaningful if each roster teacher resolves to a VISIBLY different
   * week (the real path is live since US-E18.38 / BE US-175; this fixture set
   * still backs mock mode). The roster ids come from
   * `MockPrincipalTeachersRepository` (`t-001` / `t-002` / `t-003`).
   */
  it("getByMember resolves each principal-roster teacher to their OWN week", async () => {
    const repo = new MockWeeklyTimetableRepository();
    const [lan, minh, hoa] = await Promise.all([
      repo.getByMember("t-001"),
      repo.getByMember("t-002"),
      repo.getByMember("t-003"),
    ]);

    expect(lan.className).toBe("Nguyễn Thị Lan");
    expect(minh.className).toBe("Trần Văn Minh");
    expect(hoa.className).toBe("Lê Thị Hoa");

    // Distinct subject identity per teacher (the picker must visibly change).
    expect(lan.slots[0][1]?.subjectId).toBe("math");
    expect(minh.slots[0][1]?.subjectId).toBe("lit");
    expect(hoa.slots[0][1]?.subjectId).toBe("phys");

    // …and genuinely different grids, not just a different header.
    expect(JSON.stringify(lan.slots)).not.toBe(JSON.stringify(minh.slots));
    expect(JSON.stringify(minh.slots)).not.toBe(JSON.stringify(hoa.slots));
  });

  it("getByMember still maps a parent's childId back to that child's class", async () => {
    const repo = new MockWeeklyTimetableRepository();
    expect((await repo.getByMember("c2")).classId).toBe("8B1");
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
