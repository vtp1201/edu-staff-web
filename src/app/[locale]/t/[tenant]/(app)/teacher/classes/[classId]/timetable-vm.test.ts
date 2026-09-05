/**
 * US-E24.9 — the timetable tab's server-side VM assembly. This is where the AC's
 * cross-cutting rules actually land: which slots are "mine" (decision 0074's
 * memberId, never `sub`), which week is rendered, what happens when a secondary
 * read fails, and the ONE error surface when the primary read does.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimetableSlot } from "@/features/timetable/domain/entities/timetable-slot.entity";

const authCtx = vi.fn();
const listLogs = vi.fn();
const listPreps = vi.fn();
const getTimetable = vi.fn();
const listEntries = vi.fn();
const listPlans = vi.fn();

vi.mock("@/bootstrap/di/period-log.di", () => ({
  makePeriodLogAuthContext: () => authCtx(),
  makeGetWeekPeriodLogsUseCase: async () => ({ execute: listLogs }),
  makeGetWeekPeriodPrepsUseCase: async () => ({ execute: listPreps }),
}));
vi.mock("@/bootstrap/di/timetable-view.di", () => ({
  makeGetClassTimetableUseCase: async () => ({ execute: getTimetable }),
}));
vi.mock("@/bootstrap/di/class-log.di", () => ({
  // The tab reads through the USE-CASE, not the raw repository (app layer never
  // reaches past `bootstrap/di`'s use-case factories).
  makeListEntriesUseCase: async () => ({ execute: listEntries }),
}));
vi.mock("@/bootstrap/di/lesson-plan.di", () => ({
  makeListMyLessonPlansUseCase: async () => ({ execute: listPlans }),
}));

import { buildTimetableTabVm } from "./timetable-vm";

const ME = "member-me";
const NOW = new Date(2026, 8, 2, 10, 30); // Wed 2026-09-02, ISO week 2026-W36

function slot(over: Partial<TimetableSlot> = {}): TimetableSlot {
  return {
    subjectId: "math",
    subjectName: "Toán",
    subjectColorToken: "primary",
    teacherName: "Cô Hương",
    teacherMemberId: ME,
    room: "P.302",
    ...over,
  };
}

function build(over: Record<string, unknown> = {}) {
  return buildTimetableTabVm({
    classId: "c-1",
    isHomeroom: false,
    locale: "vi",
    tenant: "t1",
    now: NOW,
    ...over,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authCtx.mockResolvedValue({ role: "teacher", memberId: ME });
  listLogs.mockResolvedValue({ ok: true, data: [] });
  listPreps.mockResolvedValue({ ok: true, data: [] });
  listEntries.mockResolvedValue({ entries: [], hasMore: false });
  listPlans.mockResolvedValue({
    ok: true,
    value: { items: [], hasMore: false },
  });
  getTimetable.mockResolvedValue({
    ok: true,
    data: {
      classId: "c-1",
      className: "11A2",
      slots: { 2: { 3: slot(), 5: slot({ teacherMemberId: "member-other" }) } },
    },
  });
});

describe("buildTimetableTabVm — week resolution", () => {
  it("renders Mon–Sat of the requested week and marks today", async () => {
    const vm = await build({ weekParam: "2026-W36" });

    expect(vm.days).toHaveLength(6);
    expect(vm.days[0].date).toBe("2026-08-31");
    expect(vm.days[5].date).toBe("2026-09-05");
    expect(vm.days.filter((d) => d.isToday).map((d) => d.date)).toEqual([
      "2026-09-02",
    ]);
    expect(vm.weekParam).toBe("2026-W36");
    expect(vm.weekRangeLabel).toBe("31/08 – 05/09");
  });

  it("a malformed ?week= silently falls back to the current week (never a 500)", async () => {
    const vm = await build({ weekParam: "../../etc/passwd" });
    expect(vm.weekParam).toBe("2026-W36");
  });

  it("prev/next hrefs keep the tab and carry the neighbouring week param", async () => {
    const vm = await build({ weekParam: "2026-W36" });
    expect(vm.prevWeekHref).toBe(
      "/vi/t/t1/teacher/classes/c-1?tab=timetable&week=2026-W35",
    );
    expect(vm.nextWeekHref).toBe(
      "/vi/t/t1/teacher/classes/c-1?tab=timetable&week=2026-W37",
    );
  });

  it("reads logs/preps for exactly the rendered Mon–Sat range (≤31 days)", async () => {
    await build({ weekParam: "2026-W36" });
    expect(listLogs).toHaveBeenCalledWith("c-1", "2026-08-31", "2026-09-05");
    expect(listPreps).toHaveBeenCalledWith("c-1", "2026-08-31", "2026-09-05");
    // GVCN only — see the homeroom-entries test below.
    expect(listEntries).not.toHaveBeenCalled();
  });

  it("reads homeroom entries ONLY for a GVCN (a GVBM's read is a guaranteed 403)", async () => {
    await build({ weekParam: "2026-W36", isHomeroom: true });

    expect(listEntries).toHaveBeenCalledWith({
      classId: "c-1",
      fromDate: "2026-08-31",
      toDate: "2026-09-05",
      limit: 20,
    });
  });

  it("builds the three shortcut hrefs with the class scoped in", async () => {
    const vm = await build();
    expect(vm.shortcuts.attendanceHref).toBe(
      "/vi/t/t1/teacher/attendance?classId=c-1",
    );
    expect(vm.shortcuts.classLogHref).toBe(
      "/vi/t/t1/teacher/class-log?classId=c-1",
    );
    expect(vm.shortcuts.teachingPlanHref).toBe(
      "/vi/t/t1/teacher/teaching-plan",
    );
  });
});

describe("buildTimetableTabVm — own-slot highlight (decision 0074)", () => {
  it("marks only the slots whose teacherMemberId matches the memberId claim", async () => {
    const vm = await build({ weekParam: "2026-W36" });
    const wed = vm.days[2].periods;

    expect(wed.map((p) => [p.periodNumber, p.isMine])).toEqual([
      [3, true],
      [5, false],
    ]);
  });

  it("a token read as `sub` instead of `memberId` highlights NOTHING (fail closed)", async () => {
    authCtx.mockResolvedValue({ role: "teacher", memberId: "sub-me" });

    const vm = await build({ weekParam: "2026-W36" });

    expect(vm.days[2].periods.every((p) => !p.isMine)).toBe(true);
    expect(vm.upcoming).toBeNull();
  });

  it("an unreadable token (empty memberId) also highlights nothing", async () => {
    authCtx.mockResolvedValue({ role: "student", memberId: "" });
    const vm = await build({ weekParam: "2026-W36" });
    expect(vm.days[2].periods.every((p) => !p.isMine)).toBe(true);
  });
});

describe("buildTimetableTabVm — bell schedule (BE US-244, optional per slot)", () => {
  it("shows no time range when the slot carries no bell times", async () => {
    const vm = await build({ weekParam: "2026-W36" });
    expect(vm.days[2].periods[0].timeRangeLabel).toBeUndefined();
    expect(vm.days[2].periods[0].isLive).toBe(false);
  });

  it("shows the range AND the live flag when times ARE present", async () => {
    getTimetable.mockResolvedValue({
      ok: true,
      data: {
        classId: "c-1",
        className: "11A2",
        slots: {
          2: { 3: slot({ startTime: "10:00", endTime: "10:45" }) },
        },
      },
    });

    const vm = await build({ weekParam: "2026-W36" });

    expect(vm.days[2].periods[0].timeRangeLabel).toBe("10:00–10:45");
    expect(vm.days[2].periods[0].isLive).toBe(true);
  });
});

describe("buildTimetableTabVm — upcoming panel", () => {
  it("picks my nearest remaining slot of the week", async () => {
    const vm = await build({ weekParam: "2026-W36" });
    expect(vm.upcoming?.periodNumber).toBe(3);
    expect(vm.upcoming?.date).toBe("2026-09-02");
    expect(vm.upcoming?.subjectName).toBe("Toán");
  });

  it("is null when the week holds no slot of mine", async () => {
    getTimetable.mockResolvedValue({
      ok: true,
      data: {
        classId: "c-1",
        className: "11A2",
        slots: { 2: { 3: slot({ teacherMemberId: "member-other" }) } },
      },
    });
    const vm = await build({ weekParam: "2026-W36" });
    expect(vm.upcoming).toBeNull();
  });
});

describe("buildTimetableTabVm — failure posture", () => {
  it("a failed TIMETABLE read yields one error surface, never a half-built grid", async () => {
    getTimetable.mockResolvedValue({
      ok: false,
      error: { type: "network-error" },
    });

    const vm = await build();

    expect(vm.errorKey).toBe("network-error");
    expect(vm.days).toEqual([]);
    expect(vm.upcoming).toBeNull();
  });

  it("a class with no published timetable maps to not-found, not a network error", async () => {
    getTimetable.mockResolvedValue({ ok: false, error: { type: "not-found" } });
    expect((await build()).errorKey).toBe("not-found");
  });

  it.each([
    [
      "logs",
      () =>
        listLogs.mockResolvedValue({
          ok: false,
          error: { type: "network-error" },
        }),
    ],
    [
      "preps",
      () =>
        listPreps.mockResolvedValue({
          ok: false,
          error: { type: "network-error" },
        }),
    ],
    [
      "homeroom entries",
      () => listEntries.mockRejectedValue({ type: "forbidden" }),
    ],
    ["lesson plans", () => listPlans.mockRejectedValue(new Error("boom"))],
  ])("a failed %s read degrades to empty WITHOUT blanking the week", async (_name, arrange) => {
    arrange();

    const vm = await build({ weekParam: "2026-W36" });

    expect(vm.errorKey).toBeUndefined();
    expect(vm.days).toHaveLength(6);
    expect(vm.days[2].periods).toHaveLength(2);
  });

  it.each([
    [
      "logs",
      () =>
        listLogs.mockResolvedValue({
          ok: false,
          error: { type: "network-error" },
        }),
    ],
    [
      "preps",
      () =>
        listPreps.mockResolvedValue({
          ok: false,
          error: { type: "slot-forbidden-or-missing" },
        }),
    ],
  ])("REPORTS a failed %s read instead of passing it off as 'nothing written yet'", async (_name, arrange) => {
    arrange();

    const vm = await build({ weekParam: "2026-W36" });

    // Both writes are full-replace PUTs: an unreadable week that renders as
    // an empty one would invite the teacher to overwrite existing work.
    expect(vm.secondaryErrorKey).toBeDefined();
    expect(vm.errorKey).toBeUndefined();
    expect(vm.days).toHaveLength(6);
  });

  it("says nothing when both secondary reads succeeded", async () => {
    const vm = await build({ weekParam: "2026-W36" });
    expect(vm.secondaryErrorKey).toBeUndefined();
  });

  it("passes the seeded rows through for the client maps to index", async () => {
    listLogs.mockResolvedValue({
      ok: true,
      data: [{ date: "2026-09-02", periodNumber: 3 }],
    });
    listPlans.mockResolvedValue({
      ok: true,
      value: { items: [{ planId: "lp-1", title: "Đạo hàm" }], hasMore: false },
    });

    const vm = await build({ weekParam: "2026-W36" });

    expect(vm.logs).toHaveLength(1);
    expect(vm.lessonPlans).toEqual([{ planId: "lp-1", title: "Đạo hàm" }]);
  });
});
