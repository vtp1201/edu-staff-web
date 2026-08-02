import { describe, expect, it } from "vitest";
import type { ChildAttendanceResponseDto } from "../dtos/child-attendance-response.dto";
import { toChildAttendanceRecords } from "./child-attendance.mapper";

/**
 * US-E18.34 contract correction: the wire enum is UPPER_SNAKE
 * (`PRESENT|ABSENT|LATE|EXCUSED_ABSENT` — `AttendanceStatus` in
 * `edu-api/services/core/docs/openapi.yaml`, ground-truthed against
 * `attendance/core/domain/valueobject/attributes.go`). US-E20.5 typed the DTO
 * with the *domain* casing, which would have leaked raw `"PRESENT"` strings
 * into the UI the moment a real repository was wired.
 */
const DTO: ChildAttendanceResponseDto = {
  memberId: "c1",
  records: [
    { date: "2026-08-03", classId: "cls-1", status: "PRESENT" },
    { date: "2026-08-04", classId: "cls-1", status: "EXCUSED_ABSENT" },
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

  it("maps every wire status to its domain casing", () => {
    const records = toChildAttendanceRecords({
      memberId: "c1",
      records: [
        { date: "2026-08-03", classId: "cls-1", status: "PRESENT" },
        { date: "2026-08-04", classId: "cls-1", status: "ABSENT" },
        { date: "2026-08-05", classId: "cls-1", status: "LATE" },
        { date: "2026-08-06", classId: "cls-1", status: "EXCUSED_ABSENT" },
      ],
    });

    expect(records.map((r) => r.status)).toEqual([
      "present",
      "absent",
      "late",
      "excusedAbsent",
    ]);
  });

  it("sorts records ascending by date", () => {
    const records = toChildAttendanceRecords({
      memberId: "c1",
      records: [
        { date: "2026-08-10", classId: "cls-1", status: "ABSENT" },
        { date: "2026-08-02", classId: "cls-1", status: "LATE" },
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
