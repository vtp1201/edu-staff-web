import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RosterStudent } from "@/features/admin-roster/domain/entities/roster-student.entity";
import type { StudentRosterScreenProps } from "@/features/admin-roster/presentation/student-roster-screen/student-roster-screen.i-vm";

/**
 * RSC page composition proof for the ADMIN roster (US-E18.35 review).
 *
 * The repo's vitest env is `node` with no renderer for async server components,
 * so we await the element tree and assert the props the page hands the client
 * screen — same technique as the sibling `principal/students/page.test.tsx`.
 *
 * The behaviour under test is the one this story made reachable: `getClassRoster`
 * is REAL now, so `{ ok: false }` happens in production. Falling back to `[]`
 * would render the "no students" empty state on a screen whose enroll/transfer
 * controls stay live — an operator could not tell a genuinely empty class from a
 * failed read.
 */

const getClasses = vi.fn();
const getClassRoster = vi.fn();
const getSearchPool = vi.fn();

vi.mock("@/bootstrap/di/admin-roster.di", () => ({
  makeRosterRepository: async () => ({
    getClasses,
    getClassRoster,
    getSearchPool,
  }),
}));

// The page imports the Server Actions purely to bind them as props; the DI they
// reach is irrelevant to page composition.
vi.mock("./actions", () => ({
  enrollAction: vi.fn(),
  transferAction: vi.fn(),
  unenrollAction: vi.fn(),
  unenrollManyAction: vi.fn(),
}));

const classes = [
  {
    id: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    homeroomTeacher: "Nguyễn Thị Hương",
    year: "2025–2026",
  },
  {
    id: "cls-10a2",
    name: "10A2",
    gradeLevel: 10,
    homeroomTeacher: null,
    year: "2025–2026",
  },
];

const roster: RosterStudent[] = [
  { id: "HS25001", name: "Nguyễn Văn An", status: "active" },
  { id: "HS25002", name: "Trần Thị Bình", status: "transferred" },
];

/** Resolves the page → Suspense → async content element into screen props. */
async function renderPageProps(classId?: string) {
  const { default: RosterPage } = await import("./page");
  const page = (await RosterPage({
    searchParams: Promise.resolve({ classId }),
  })) as ReactElement<{ children: ReactElement }>;
  const content = page.props.children as ReactElement<{ classId?: string }> & {
    type: (props: { classId?: string }) => Promise<ReactElement | null>;
  };
  return (await content.type(
    content.props,
  )) as ReactElement<StudentRosterScreenProps> | null;
}

describe("Admin RosterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSearchPool.mockResolvedValue({ ok: true, data: [] });
  });

  it("defaults to the first class and derives the status counts", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: roster });

    const screen = await renderPageProps();

    expect(getClassRoster).toHaveBeenCalledWith("cls-10a1");
    expect(screen?.props.vm.currentClass.id).toBe("cls-10a1");
    expect(screen?.props.vm.activeCount).toBe(1);
    expect(screen?.props.vm.transferredCount).toBe(1);
    expect(screen?.props.vm.fetchError).toBeNull();
  });

  it("honours the ?classId= query param", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: [] });

    const screen = await renderPageProps("cls-10a2");

    expect(getClassRoster).toHaveBeenCalledWith("cls-10a2");
    expect(screen?.props.vm.currentClass.id).toBe("cls-10a2");
  });

  it("keeps a genuinely empty class as an empty roster with no fetchError", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: [] });

    const screen = await renderPageProps();

    expect(screen?.props.vm.roster).toEqual([]);
    expect(screen?.props.vm.fetchError).toBeNull();
  });

  it("surfaces a 403 roster read as fetchError, NOT as an empty roster", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({
      ok: false,
      error: { type: "forbidden" },
    });

    const screen = await renderPageProps();

    expect(screen?.props.vm.fetchError).toBe("forbidden");
    expect(screen?.props.vm.roster).toEqual([]);
    // Counts must not read as "0 active students" — that is data, not a guess.
    expect(screen?.props.vm.activeCount).toBe(0);
    // The class picker survives so the operator can move on / retry elsewhere.
    expect(screen?.props.vm.currentClass.id).toBe("cls-10a1");
  });

  it("surfaces a transient roster failure as its own fetchError key", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({
      ok: false,
      error: { type: "network-error" },
    });

    const screen = await renderPageProps();

    expect(screen?.props.vm.fetchError).toBe("network-error");
  });

  /**
   * The candidate pool became a REAL two-service composition in US-E18.41, so
   * `{ ok: false }` is now reachable in production. It still must NOT drive
   * `fetchError` — blanking a roster that loaded fine because a side panel could
   * not fill would be the opposite over-reaction — but it must not read as "no
   * candidates" either, hence its own key.
   */
  it("keeps the loaded roster when only the candidate-pool read fails", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: roster });
    getSearchPool.mockResolvedValue({ ok: false, error: { type: "unknown" } });

    const screen = await renderPageProps();

    expect(screen?.props.vm.fetchError).toBeNull();
    expect(screen?.props.vm.roster).toHaveLength(2);
    expect(screen?.props.vm.searchPool).toEqual([]);
  });

  it("surfaces a failed pool read as poolError, never as an empty candidate list", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: roster });
    getSearchPool.mockResolvedValue({
      ok: false,
      error: { type: "forbidden" },
    });

    const screen = await renderPageProps();

    expect(screen?.props.vm.poolError).toBe("forbidden");
    expect(screen?.props.vm.searchPool).toEqual([]);
  });

  it("leaves poolError null when the pool read succeeds (even if genuinely empty)", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: roster });
    getSearchPool.mockResolvedValue({ ok: true, data: [] });

    const screen = await renderPageProps();

    expect(screen?.props.vm.poolError).toBeNull();
  });
});
