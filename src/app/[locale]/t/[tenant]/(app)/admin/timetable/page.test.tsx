import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimetableData } from "@/features/admin/timetable/domain/entities/timetable.entity";
import type { TimetableScreenProps } from "@/features/admin/timetable/presentation/timetable-screen/timetable-screen";

/**
 * RSC page composition proof for the ADMIN timetable builder (US-E18.48).
 *
 * The repo's vitest env is `node` with no renderer for async server components,
 * so we await the element tree and assert the props the page hands the client
 * screen — same technique as the sibling `admin/roster/page.test.tsx`.
 *
 * The behaviour under test is what this story made reachable: the whole-school
 * conflicts scan (BE US-188) is a SECOND, independent real read on this route.
 * It must (a) run in parallel with the class timetable, (b) drive the per-cell
 * highlight in real mode, and (c) degrade inside the panel when it fails —
 * never blanking the grid and never reading as "no conflicts".
 */

const executeTimetable = vi.fn();
const executeConflicts = vi.fn();

vi.mock("@/bootstrap/di/timetable.di", () => ({
  makeGetTimetableUseCase: async () => ({ execute: executeTimetable }),
  makeGetTimetableConflictsUseCase: async () => ({ execute: executeConflicts }),
}));

// The page imports the Server Actions purely to bind them as props.
vi.mock("./actions", () => ({
  updateSlotAction: vi.fn(),
  clearSlotAction: vi.fn(),
}));

const DATA: TimetableData = {
  classId: "cls-10a1",
  yearId: "2025-2026",
  slots: {
    "cls-10a1|0|1": {
      slotKey: "cls-10a1|0|1",
      classId: "cls-10a1",
      day: 0,
      period: 1,
      subjectId: "sub-math",
      teacherId: "tch-1",
      room: "P.201",
    },
  },
};

const TEACHER_CONFLICT = {
  type: "teacher-double-booked" as const,
  day: 0,
  period: 1,
  classes: [
    { classId: "cls-10a1", subjectId: "sub-math" },
    { classId: "cls-10a2", subjectId: "sub-math" },
  ],
  teacherId: "tch-1",
};

/** Resolves the page → Suspense → async content element into screen props. */
async function renderScreenProps(
  searchParams: { classId?: string; yearId?: string } = {},
) {
  const { default: TimetablePage } = await import("./page");
  const page = (await TimetablePage({
    searchParams: Promise.resolve(searchParams),
  })) as ReactElement<{ children: ReactElement }>;
  const content = page.props.children as ReactElement<{
    classId: string;
    yearId: string;
  }> & {
    type: (props: {
      classId: string;
      yearId: string;
    }) => Promise<ReactElement | null>;
  };
  return (await content.type(
    content.props,
  )) as ReactElement<TimetableScreenProps>;
}

describe("Admin TimetablePage — whole-school conflicts scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeTimetable.mockResolvedValue(DATA);
    executeConflicts.mockResolvedValue({
      ok: true,
      value: { termId: "term-1", conflicts: [], truncated: false },
    });
  });

  it("issues the scan with NO arguments (whole tenant, term resolved server-side)", async () => {
    await renderScreenProps();
    expect(executeConflicts).toHaveBeenCalledWith();
  });

  it("threads a successful scan into the panel VM", async () => {
    executeConflicts.mockResolvedValue({
      ok: true,
      value: {
        termId: "term-1",
        conflicts: [TEACHER_CONFLICT],
        truncated: true,
      },
    });

    const screen = await renderScreenProps();
    const scan = screen.props.vm.conflictScan;

    expect(scan.status).toBe("ok");
    if (scan.status !== "ok") return;
    expect(scan.truncated).toBe(true);
    expect(scan.rows).toHaveLength(1);
    expect(scan.rows[0].type).toBe("teacher-double-booked");
  });

  it("drives the per-cell highlight from the real scan (dead in real mode before this story)", async () => {
    executeConflicts.mockResolvedValue({
      ok: true,
      value: {
        termId: "term-1",
        conflicts: [TEACHER_CONFLICT],
        truncated: false,
      },
    });

    const screen = await renderScreenProps();

    expect(screen.props.vm.conflictSlotKeys.has("cls-10a1|0|1")).toBe(true);
    expect(screen.props.vm.slots["cls-10a1|0|1"].hasConflict).toBe(true);
  });

  it("degrades a FAILED scan inside the panel without blanking the grid", async () => {
    executeConflicts.mockResolvedValue({
      ok: false,
      failure: { type: "forbidden", message: "admin only" },
    });

    const screen = await renderScreenProps();

    expect(screen.props.vm.conflictScan).toEqual({
      status: "error",
      errorKey: "forbidden",
    });
    // The timetable the admin came to edit is still fully rendered…
    expect(Object.keys(screen.props.vm.slots)).toHaveLength(1);
    // …and a failed scan is never reported as a clean school.
    expect(screen.props.vm.conflicts).toEqual([]);
    expect(screen.props.vm.conflictSlotKeys.size).toBe(0);
  });

  it("still renders the grid when the scan is empty but successful", async () => {
    const screen = await renderScreenProps();
    expect(screen.props.vm.conflictScan).toEqual({
      status: "ok",
      rows: [],
      truncated: false,
    });
  });

  it("honours ?classId= / ?yearId= and passes them to the class read", async () => {
    await renderScreenProps({ classId: "cls-10a2", yearId: "2024-2025" });
    expect(executeTimetable).toHaveBeenCalledWith("cls-10a2", "2024-2025");
  });

  it("falls an unknown ?classId= back to the default class", async () => {
    await renderScreenProps({ classId: "cls-does-not-exist" });
    expect(executeTimetable.mock.calls[0][0]).toBe("cls-10a1");
  });
});
