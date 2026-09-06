import { describe, expect, it } from "vitest";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ChildAttendanceRecord } from "@/features/parent-attendance/domain/entities/child-attendance-record.entity";
import { joinAbsenceReasons } from "./join-absence-reasons";

const rec = (
  date: string,
  status: ChildAttendanceRecord["status"],
): ChildAttendanceRecord => ({ date, status });

/**
 * `LeaveRequestEntity` dates are PRE-FORMATTED `DD/MM/YYYY` by
 * `leave-request.mapper.ts` — the join has to normalise them, which is exactly
 * what these fixtures exercise.
 */
const leave = (
  over: Partial<LeaveRequestEntity> & Pick<LeaveRequestEntity, "id">,
): LeaveRequestEntity => ({
  studentId: "st-1",
  studentName: "Nguyễn Minh Khoa",
  initials: "NK",
  avatarTone: "primary",
  classId: "cls-1",
  className: "11A2",
  submittedBy: "parent",
  submitterName: "Nguyễn Văn A",
  reason: "Ốm — sốt virus",
  startDate: "05/03/2026",
  endDate: "05/03/2026",
  dayCount: 1,
  type: "other",
  status: "approved",
  submittedAt: "2026-03-04T02:00:00Z",
  approvedBy: null,
  rejectedBy: null,
  rejectionReason: null,
  ...over,
});

describe("joinAbsenceReasons — history rows", () => {
  it("keeps only ABSENT / EXCUSED_ABSENT days (present + late are not absences)", () => {
    const rows = joinAbsenceReasons(
      [
        rec("2026-03-02", "present"),
        rec("2026-03-03", "late"),
        rec("2026-03-04", "absent"),
        rec("2026-03-05", "excusedAbsent"),
      ],
      [],
    );

    expect(rows.map((r) => [r.date, r.kind])).toEqual([
      ["2026-03-05", "excused"],
      ["2026-03-04", "absent"],
    ]);
  });

  it("orders absences newest-first", () => {
    const rows = joinAbsenceReasons(
      [
        rec("2026-01-20", "absent"),
        rec("2026-04-22", "absent"),
        rec("2026-03-17", "absent"),
      ],
      [],
    );

    expect(rows.map((r) => r.date)).toEqual([
      "2026-04-22",
      "2026-03-17",
      "2026-01-20",
    ]);
  });

  it("gives every row a stable unique key", () => {
    const rows = joinAbsenceReasons(
      [rec("2026-03-04", "absent"), rec("2026-03-05", "excusedAbsent")],
      [leave({ id: "lr-1", status: "pending" })],
    );

    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});

describe("joinAbsenceReasons — APPROVED request supplies the reason", () => {
  it("matches a single-day request to that exact day", () => {
    const rows = joinAbsenceReasons(
      [rec("2026-03-05", "excusedAbsent")],
      [leave({ id: "lr-1", startDate: "05/03/2026", endDate: "05/03/2026" })],
    );

    expect(rows[0].reason).toBe("Ốm — sốt virus");
  });

  it("matches every day inside a multi-day range (inclusive on both ends)", () => {
    const rows = joinAbsenceReasons(
      [
        rec("2026-03-04", "excusedAbsent"),
        rec("2026-03-05", "excusedAbsent"),
        rec("2026-03-06", "excusedAbsent"),
        rec("2026-03-07", "absent"),
      ],
      [
        leave({
          id: "lr-1",
          startDate: "04/03/2026",
          endDate: "06/03/2026",
          reason: "Việc gia đình",
        }),
      ],
    );

    const byDate = Object.fromEntries(rows.map((r) => [r.date, r.reason]));
    expect(byDate["2026-03-04"]).toBe("Việc gia đình");
    expect(byDate["2026-03-05"]).toBe("Việc gia đình");
    expect(byDate["2026-03-06"]).toBe("Việc gia đình");
    // Outside the range → no reason invented.
    expect(byDate["2026-03-07"]).toBeNull();
  });

  it("accepts ISO `YYYY-MM-DD` request dates too (not only the mapper's DD/MM/YYYY)", () => {
    const rows = joinAbsenceReasons(
      [rec("2026-03-05", "excusedAbsent")],
      [leave({ id: "lr-1", startDate: "2026-03-05", endDate: "2026-03-05" })],
    );

    expect(rows[0].reason).toBe("Ốm — sốt virus");
  });

  it("does NOT take a reason from a pending or rejected request", () => {
    const rows = joinAbsenceReasons(
      [rec("2026-03-05", "absent")],
      [
        leave({ id: "lr-1", status: "rejected", reason: "Bị từ chối" }),
        leave({ id: "lr-2", status: "pending", reason: "Đang chờ" }),
      ],
    );

    const absenceRow = rows.find((r) => r.kind === "absent");
    expect(absenceRow?.reason).toBeNull();
  });

  it("leaves the reason null when no request covers the day", () => {
    const rows = joinAbsenceReasons([rec("2026-04-22", "absent")], []);
    expect(rows[0].reason).toBeNull();
  });
});

describe("joinAbsenceReasons — SUBMITTED requests become pending rows", () => {
  it("prepends one pending row per SUBMITTED request, ahead of every absence", () => {
    const rows = joinAbsenceReasons(
      [rec("2026-04-22", "absent")],
      [
        leave({
          id: "lr-9",
          status: "pending",
          startDate: "10/05/2026",
          endDate: "12/05/2026",
          reason: "Khám sức khoẻ",
        }),
      ],
    );

    expect(rows[0]).toEqual({
      key: "pending-lr-9",
      date: "2026-05-10",
      endDate: "2026-05-12",
      kind: "pending",
      reason: "Khám sức khoẻ",
    });
    expect(rows[1].kind).toBe("absent");
  });

  it("carries the WHOLE range, not just the first day", () => {
    const rows = joinAbsenceReasons(
      [],
      [
        leave({
          id: "lr-9",
          status: "pending",
          startDate: "10/05/2026",
          endDate: "12/05/2026",
        }),
      ],
    );

    expect(rows[0].date).toBe("2026-05-10");
    expect(rows[0].endDate).toBe("2026-05-12");
  });

  it("sorts multiple pending rows newest-first among themselves", () => {
    const rows = joinAbsenceReasons(
      [],
      [
        leave({ id: "a", status: "pending", startDate: "01/05/2026" }),
        leave({ id: "b", status: "pending", startDate: "20/05/2026" }),
      ],
    );

    expect(rows.map((r) => r.key)).toEqual(["pending-b", "pending-a"]);
  });

  it("emits a single-day pending row with endDate === date", () => {
    const rows = joinAbsenceReasons(
      [],
      [
        leave({
          id: "lr-1",
          status: "pending",
          startDate: "10/05/2026",
          endDate: "10/05/2026",
        }),
      ],
    );

    expect(rows[0].endDate).toBe(rows[0].date);
  });

  it("returns an empty list when there is nothing to show", () => {
    expect(joinAbsenceReasons([], [])).toEqual([]);
  });
});
