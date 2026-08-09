import { describe, expect, it } from "vitest";
import type { MemberTimetableResponseDto } from "../dtos/member-timetable-response.dto";
import type { RealTimetableResponseDto } from "../dtos/real-timetable-response.dto";
import {
  mapMemberWeeklyTimetable,
  mapRealWeeklyTimetable,
} from "./real-weekly-timetable.mapper";

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

  it("colours UUID subjectIds too, one colour each (they used to render grey)", () => {
    const vm = mapRealWeeklyTimetable(DTO, "11A2");
    const a = vm.slots[0]?.[1]?.subjectColorToken;
    const b = vm.slots[4]?.[5]?.subjectColorToken;
    expect(a).not.toBe("muted");
    expect(b).not.toBe("muted");
    expect(a).not.toBe(b);
  });
});

describe("mapMemberWeeklyTimetable (US-E18.26 by-member)", () => {
  const DTO: MemberTimetableResponseDto = {
    memberId: "mem-1",
    termId: "term-1",
    slots: [
      {
        classId: "cls-a",
        day: "MON",
        period: 1,
        subjectId: "sub-1",
        subjectName: "Toán",
        teacherMemberId: "tch-1",
        room: "P.201",
      },
      {
        classId: "cls-b",
        day: "FRI",
        period: 5,
        subjectId: "sub-2",
        teacherMemberId: "tch-2",
      },
    ],
  };

  const classNameOf = (id: string) =>
    ({ "cls-a": "11A2" })[id as "cls-a"] as string | undefined;

  it("nests slots by [dayIndex][period] and keeps the caller-supplied top-level identity", () => {
    const vm = mapMemberWeeklyTimetable(DTO, classNameOf, {
      classId: "mem-1",
      className: "",
    });
    expect(vm.classId).toBe("mem-1");
    expect(vm.className).toBe("");
    expect(vm.slots[0]?.[1]?.subjectId).toBe("sub-1");
    expect(vm.slots[4]?.[5]?.subjectId).toBe("sub-2");
  });

  it("uses the server-resolved subjectName and the real room when present", () => {
    const vm = mapMemberWeeklyTimetable(DTO, classNameOf, {
      classId: "mem-1",
      className: "",
    });
    const slot = vm.slots[0]?.[1];
    expect(slot?.subjectName).toBe("Toán");
    expect(slot?.room).toBe("P.201");
  });

  it("falls back to the raw subjectId when the wire omits subjectName, and leaves room undefined", () => {
    const vm = mapMemberWeeklyTimetable(DTO, classNameOf, {
      classId: "mem-1",
      className: "",
    });
    const slot = vm.slots[4]?.[5];
    expect(slot?.subjectName).toBe("sub-2");
    expect(slot?.room).toBeUndefined();
  });

  it("resolves per-slot className from the lookup, leaving it undefined when unresolved", () => {
    const vm = mapMemberWeeklyTimetable(DTO, classNameOf, {
      classId: "mem-1",
      className: "",
    });
    expect(vm.slots[0]?.[1]?.className).toBe("11A2");
    expect(vm.slots[4]?.[5]?.className).toBeUndefined();
  });

  it("still falls the teacher display name back to the raw id (ask #6/#7 stands)", () => {
    const vm = mapMemberWeeklyTimetable(DTO, classNameOf, {
      classId: "mem-1",
      className: "",
    });
    expect(vm.slots[0]?.[1]?.teacherName).toBe("tch-1");
  });
});
