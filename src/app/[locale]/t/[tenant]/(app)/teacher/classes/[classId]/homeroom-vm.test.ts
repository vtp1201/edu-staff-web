import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ViolationEntity } from "@/features/discipline/domain/entities/violation.entity";

/**
 * US-E24.11 — the homeroom tab's ViewModel assembly. Three INDEPENDENT reads:
 * one rejecting must leave the other two cards fully rendered (AC "lỗi từng
 * card độc lập"), and the attendance card must distinguish "chưa điểm danh"
 * from "everyone present".
 */

const attendanceExec = vi.fn();
const violationsExec = vi.fn();
const leaveExec = vi.fn();

vi.mock("@/bootstrap/di/attendance.di", () => ({
  makeGetClassAttendanceUseCase: async () => ({ execute: attendanceExec }),
}));
vi.mock("@/bootstrap/di/discipline.di", () => ({
  makeGetViolationsUseCase: async () => ({ execute: violationsExec }),
  makeGetLeaveRequestsUseCase: async () => ({ execute: leaveExec }),
}));

function violation(over: Partial<ViolationEntity> = {}): ViolationEntity {
  return {
    id: "v-1",
    studentId: "s-1",
    studentName: "Nguyễn Minh Khoa",
    initials: "KN",
    avatarTone: "primary",
    classId: "cls-10a1",
    className: "10A1",
    type: "late",
    date: "2026-09-01",
    period: 1,
    description: "Đi học muộn 15 phút",
    severity: "low",
    handledBy: "Nguyễn Thị Hương",
    status: "recorded",
    ...over,
  };
}

function leave(over: Partial<LeaveRequestEntity> = {}): LeaveRequestEntity {
  return {
    id: "l-1",
    studentId: "s-30",
    studentName: "Lê Thị Cẩm",
    initials: "CL",
    avatarTone: "success",
    classId: "cls-10a1",
    className: "10A1",
    submittedBy: "parent",
    submitterName: "Lê Văn Đức",
    reason: "Khám bệnh định kỳ",
    startDate: "02/09/2026",
    endDate: "03/09/2026",
    dayCount: 2,
    type: "other",
    status: "pending",
    submittedAt: "2026-09-01T08:00:00Z",
    approvedBy: null,
    rejectedBy: null,
    rejectionReason: null,
    ...over,
  };
}

const ROSTER = {
  classDate: { classId: "cls-10a1", date: "2026-09-02" },
  taken: true,
  records: [
    { studentId: "s-1", studentName: "A", status: "present" as const },
    { studentId: "s-2", studentName: "B", status: "present" as const },
    { studentId: "s-3", studentName: "C", status: "excusedAbsent" as const },
    { studentId: "s-4", studentName: "D", status: "absent" as const },
    { studentId: "s-5", studentName: "E", status: "late" as const },
  ],
};

async function build(overrides: Partial<{ now: Date }> = {}) {
  const { buildHomeroomTabVm } = await import("./homeroom-vm");
  return buildHomeroomTabVm({
    classId: "cls-10a1",
    locale: "vi",
    tenant: "t1",
    now: overrides.now ?? new Date("2026-09-02T10:00:00Z"),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  attendanceExec.mockResolvedValue(ROSTER);
  violationsExec.mockResolvedValue([violation()]);
  leaveExec.mockResolvedValue([leave()]);
});

describe("buildHomeroomTabVm — attendance card", () => {
  it("tallies the three shown buckets and marks the day taken", async () => {
    const vm = await build();

    expect(vm.attendance.ok).toBe(true);
    if (!vm.attendance.ok) return;
    expect(vm.attendance.data).toMatchObject({
      taken: true,
      present: 2,
      excused: 1,
      absent: 1,
    });
  });

  it("reads today from the injected clock, in LOCAL time", async () => {
    await build({ now: new Date(2026, 8, 2, 23, 30) });
    expect(attendanceExec).toHaveBeenCalledWith("cls-10a1", "2026-09-02");
  });

  it("builds the attendance deep link with the class AND the same date", async () => {
    const vm = await build({ now: new Date(2026, 8, 2, 9, 0) });
    if (!vm.attendance.ok) throw new Error("expected ok");
    expect(vm.attendance.data.attendanceHref).toBe(
      "/vi/t/t1/teacher/attendance?classId=cls-10a1&date=2026-09-02",
    );
  });

  it("an untaken day still reports zeros — the CARD decides to render '—', not the builder", async () => {
    attendanceExec.mockResolvedValue({ ...ROSTER, taken: false, records: [] });

    const vm = await build();
    if (!vm.attendance.ok) throw new Error("expected ok");
    expect(vm.attendance.data).toMatchObject({
      taken: false,
      present: 0,
      excused: 0,
      absent: 0,
    });
  });
});

describe("buildHomeroomTabVm — open-violations card", () => {
  it("keeps only unresolved rows of THIS class and counts them", async () => {
    violationsExec.mockResolvedValue([
      violation({ id: "v-1", status: "recorded" }),
      violation({ id: "v-2", status: "parent_confirmed" }),
      violation({ id: "v-3", status: "recorded", classId: "cls-other" }),
    ]);

    const vm = await build();
    if (!vm.violations.ok) throw new Error("expected ok");
    expect(vm.violations.data.items.map((i) => i.id)).toEqual(["v-1"]);
    expect(vm.violations.data.count).toBe(1);
  });

  it("formats the row date as DD/MM/YYYY and carries the discipline deep link", async () => {
    const vm = await build();
    if (!vm.violations.ok) throw new Error("expected ok");
    expect(vm.violations.data.items[0].dateLabel).toBe("01/09/2026");
    expect(vm.violations.data.disciplineHref).toBe(
      "/vi/t/t1/teacher/discipline?classId=cls-10a1",
    );
  });

  it("an empty list is a SUCCESSFUL empty card, not an error", async () => {
    violationsExec.mockResolvedValue([]);
    const vm = await build();
    expect(vm.violations).toEqual({
      ok: true,
      data: {
        items: [],
        count: 0,
        disciplineHref: "/vi/t/t1/teacher/discipline?classId=cls-10a1",
      },
    });
  });
});

describe("buildHomeroomTabVm — pending-leave card", () => {
  it("asks for THIS class's inbox and keeps only still-pending rows", async () => {
    leaveExec.mockResolvedValue([
      leave({ id: "l-1", status: "pending" }),
      leave({ id: "l-2", status: "approved" }),
      leave({ id: "l-3", status: "rejected" }),
    ]);

    const vm = await build();

    expect(leaveExec).toHaveBeenCalledWith({ classId: "cls-10a1" });
    if (!vm.leave.ok) throw new Error("expected ok");
    expect(vm.leave.data.requests.map((r) => r.id)).toEqual(["l-1"]);
  });
});

describe("buildHomeroomTabVm — independent failure", () => {
  it("a rejected leave read leaves the other two cards intact", async () => {
    leaveExec.mockRejectedValue({ type: "forbidden" });

    const vm = await build();

    expect(vm.attendance.ok).toBe(true);
    expect(vm.violations.ok).toBe(true);
    expect(vm.leave.ok).toBe(false);
  });

  it("a rejected attendance read leaves the other two cards intact", async () => {
    attendanceExec.mockRejectedValue({ type: "not-found" });

    const vm = await build();

    expect(vm.attendance.ok).toBe(false);
    expect(vm.violations.ok).toBe(true);
    expect(vm.leave.ok).toBe(true);
  });

  it("every failed card retries by re-navigating to the SAME tab url (a real GET, no client JS)", async () => {
    attendanceExec.mockRejectedValue(new Error("boom"));
    violationsExec.mockRejectedValue(new Error("boom"));
    leaveExec.mockRejectedValue(new Error("boom"));

    const vm = await build();

    const href = "/vi/t/t1/teacher/classes/cls-10a1?tab=homeroom";
    for (const cell of [vm.attendance, vm.violations, vm.leave]) {
      expect(cell).toEqual({ ok: false, retryHref: href });
    }
  });

  it("percent-encodes a class id in the retry link", async () => {
    attendanceExec.mockRejectedValue(new Error("boom"));
    const { buildHomeroomTabVm } = await import("./homeroom-vm");
    const vm = await buildHomeroomTabVm({
      classId: "a/b",
      locale: "vi",
      tenant: "t1",
      now: new Date("2026-09-02T10:00:00Z"),
    });
    expect(vm.attendance.ok).toBe(false);
    if (vm.attendance.ok) return;
    expect(vm.attendance.retryHref).toBe(
      "/vi/t/t1/teacher/classes/a%2Fb?tab=homeroom",
    );
  });

  it("runs the three reads CONCURRENTLY, not one after another", async () => {
    const started: string[] = [];
    const gate = (name: string) =>
      vi.fn().mockImplementation(async () => {
        started.push(name);
        await new Promise((r) => setTimeout(r, 0));
        return name === "attendance" ? ROSTER : [];
      });
    attendanceExec.mockImplementation(gate("attendance"));
    violationsExec.mockImplementation(gate("violations"));
    leaveExec.mockImplementation(gate("leave"));

    await build();

    expect(started).toEqual(["attendance", "violations", "leave"]);
  });
});
