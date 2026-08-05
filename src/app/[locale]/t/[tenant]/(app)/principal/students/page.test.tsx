import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RosterStudent } from "@/features/admin-roster/domain/entities/roster-student.entity";
import type { PrincipalRosterScreenProps } from "@/features/admin-roster/presentation/principal-roster-screen/principal-roster-screen.i-vm";

/**
 * RSC page composition proof (US-E13.10). The repo's vitest env is `node` with
 * no renderer for async server components, so we await the element tree and
 * assert the props the page hands the client screen — the same technique
 * US-E23.2 used for its routing gate.
 */

const getClasses = vi.fn();
const getClassRoster = vi.fn();

vi.mock("@/bootstrap/di/admin-roster.di", () => ({
  makeRosterRepository: async () => ({ getClasses, getClassRoster }),
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
  {
    id: "HS25001",
    name: "Nguyễn Văn An",
    dob: "01/01/2010",
    gender: "M",
    status: "active",
  },
  {
    id: "HS25002",
    name: "Trần Thị Bình",
    dob: "02/02/2010",
    gender: "F",
    status: "transferred",
  },
];

/** Resolves the page → Suspense → async content element into screen props. */
async function renderPageVm(classId?: string) {
  const { default: PrincipalStudentsPage } = await import("./page");
  const page = (await PrincipalStudentsPage({
    searchParams: Promise.resolve({ classId }),
  })) as ReactElement<{ children: ReactElement }>;
  const content = page.props.children as ReactElement<{ classId?: string }> & {
    type: (props: { classId?: string }) => Promise<ReactElement>;
  };
  const screen = (await content.type(
    content.props,
  )) as ReactElement<PrincipalRosterScreenProps>;
  return screen.props.vm;
}

describe("PrincipalStudentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to the first class and derives the status counts", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: roster });

    const vm = await renderPageVm();

    expect(getClassRoster).toHaveBeenCalledWith("cls-10a1");
    expect(vm.currentClass?.id).toBe("cls-10a1");
    expect(vm.activeCount).toBe(1);
    expect(vm.transferredCount).toBe(1);
    expect(vm.fetchError).toBeNull();
  });

  it("honours the ?classId= query param", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: [] });

    const vm = await renderPageVm("cls-10a2");

    expect(getClassRoster).toHaveBeenCalledWith("cls-10a2");
    expect(vm.currentClass?.id).toBe("cls-10a2");
  });

  it("falls back to the first class when the query param is unknown", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: [] });

    const vm = await renderPageVm("cls-does-not-exist");

    expect(vm.currentClass?.id).toBe("cls-10a1");
  });

  it("renders the no-classes shell (not an error) for a school with no class", async () => {
    getClasses.mockResolvedValue({ ok: true, data: [] });

    const vm = await renderPageVm();

    expect(getClassRoster).not.toHaveBeenCalled();
    expect(vm.currentClass).toBeNull();
    expect(vm.fetchError).toBeNull();
  });

  it("surfaces a class-list failure as a fetchError key", async () => {
    getClasses.mockResolvedValue({ ok: false, error: { type: "forbidden" } });

    const vm = await renderPageVm();

    expect(vm.fetchError).toBe("forbidden");
    expect(getClassRoster).not.toHaveBeenCalled();
  });

  /**
   * A MANAGER-principal now reads the roster (US-E18.39). Core's
   * `ListStudentsInClassUseCase.authorize()` grants
   * `isAdmin(...) || hasRole(..., roleManager)` since BE US-175 (edu-api
   * `011b82b2`, closing ask #46), matching `list_classes.go`'s US-164 grant. Web's
   * `principal` appRole collapses BOTH ADMIN and MANAGER, so the whole
   * class-list-OK-but-roster-403 shape that used to be pinned here for MANAGER is
   * gone: this role reads through, with the class picker intact.
   *
   * The picker assertion is the regression guard — the old failure rendered
   * `errorVm()`, i.e. `classes: []` + `currentClass: null`.
   */
  it("reads the roster with the class picker intact for a principal actor (BE US-175 MANAGER grant)", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({ ok: true, data: roster });

    const vm = await renderPageVm();

    expect(vm.fetchError).toBeNull();
    expect(vm.classes.map((c) => c.id)).toEqual(["cls-10a1", "cls-10a2"]);
    expect(vm.currentClass?.id).toBe("cls-10a1");
    expect(vm.roster).toHaveLength(2);
  });

  /**
   * A roster-read 403 is still a legitimate, role-agnostic state to cover — the
   * page has no role-specific branch, and callers without the grant (e.g. a
   * TEACHER holding no assignment to the class, per the same `authorize()`) still
   * get `ROSTER_ACCESS_FORBIDDEN`. What is NO LONGER true is that a
   * MANAGER-principal triggers it (see the test above).
   *
   * When it does happen the screen must say "you may not read this"
   * (non-retryable, no retry control — proven on `PrincipalRosterScreen`'s
   * `ForbiddenError` story), never render a roster that merely looks empty.
   */
  it("degrades honestly when the roster read is 403'd (class list still OK)", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({
      ok: false,
      error: { type: "forbidden" },
    });

    const vm = await renderPageVm();

    expect(getClassRoster).toHaveBeenCalledWith("cls-10a1");
    expect(vm.fetchError).toBe("forbidden");
    // Not a false-empty: the roster/count slots must not read as "no students".
    expect(vm.roster).toEqual([]);
    expect(vm.currentClass).toBeNull();
  });

  it("surfaces a roster failure as a fetchError key", async () => {
    getClasses.mockResolvedValue({ ok: true, data: classes });
    getClassRoster.mockResolvedValue({
      ok: false,
      error: { type: "network-error" },
    });

    const vm = await renderPageVm();

    expect(vm.fetchError).toBe("network-error");
  });
});
