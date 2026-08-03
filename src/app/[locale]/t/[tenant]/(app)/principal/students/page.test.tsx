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
   * MANAGER-principal 403 (US-E18.35 review). Core's
   * `ListStudentsInClassUseCase.authorize()` allows only `isAdmin`
   * (SUPER_ADMIN/ADMIN) or a TEACHER assigned to the class — the US-164 MANAGER
   * grant is scoped to `list_classes.go` alone. Web's `principal` appRole maps
   * from BOTH ADMIN and MANAGER, so this 403 is reachable in production, on a
   * role whose class list read SUCCEEDS.
   *
   * The screen must therefore say "you may not read this" (non-retryable, no
   * retry control — proven on `PrincipalRosterScreen`'s `ForbiddenError` story),
   * never render a roster that merely looks empty.
   */
  it("degrades honestly when a MANAGER-principal is 403'd on the roster read (class list still OK)", async () => {
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
