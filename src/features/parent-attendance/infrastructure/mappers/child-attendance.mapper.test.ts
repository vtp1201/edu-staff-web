import { describe, expect, it } from "vitest";
import type { ChildAttendanceResponseDto } from "../dtos/child-attendance-response.dto";
import { toChildAttendanceRecords } from "./child-attendance.mapper";

const DTO: ChildAttendanceResponseDto = {
  memberId: "c1",
  records: [
    { date: "2026-08-03", classId: "cls-1", status: "present" },
    { date: "2026-08-04", classId: "cls-1", status: "excusedAbsent" },
  ],
};

describe("toChildAttendanceRecords", () => {
  it("keeps date + status and DROPS classId (no UI surface consumes it)", () => {
    const records = toChildAttendanceRecords(DTO);

    expect(records).toEqual([
      { date: "2026-08-03", status: "present" },
      { date: "2026-08-04", status: "excusedAbsent" },
    ]);
    // key-set assertion — toEqual alone would not catch an extra leaked field
    expect(Object.keys(records[0]).sort()).toEqual(["date", "status"]);
  });

  it("sorts records ascending by date", () => {
    const records = toChildAttendanceRecords({
      memberId: "c1",
      records: [
        { date: "2026-08-10", classId: "cls-1", status: "absent" },
        { date: "2026-08-02", classId: "cls-1", status: "late" },
      ],
    });

    expect(records.map((r) => r.date)).toEqual(["2026-08-02", "2026-08-10"]);
  });

  it("maps an empty record list to an empty array", () => {
    expect(toChildAttendanceRecords({ memberId: "c1", records: [] })).toEqual(
      [],
    );
  });
});
