/**
 * US-E24.16 — composition posture of the PARENT academic-record RSC.
 *
 * Asserted by inspecting the props of the returned `<AcademicRecordContainer>`
 * element (the RSC returns a React element without rendering it).
 *
 * Scope note, deliberately narrow: the two READS are stubbed here. Their real
 * wiring is already proved elsewhere (`build-academic-record-vm` against the
 * real DI, `bootstrap/di/grades.di` + `/parent/attendance/page.test.ts` for the
 * child roster). What is NEW in this story — and what only this test can prove —
 * is the COMPOSITION rule between them: the child list is a secondary read, so
 * losing it may cost the selector and nothing else, while the record read stays
 * the primary one whose own error surfaces unchanged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChildSwitcherChild } from "@/components/shared/child-switcher";
import type { AcademicRecordScreenVM } from "@/features/academic-records/presentation/academic-record-screen/academic-record-screen.i-vm";

const buildAcademicRecordVM = vi.fn();
const execute = vi.fn();

vi.mock(
  "@/features/academic-records/presentation/academic-record-screen/build-academic-record-vm",
  () => ({
    buildAcademicRecordVM: (...args: unknown[]) =>
      buildAcademicRecordVM(...args),
  }),
);

vi.mock("@/bootstrap/di/grades.di", () => ({
  makeGetChildListUseCase: async () => ({ execute }),
}));

function child(childId: string, ordinal: number): ChildSwitcherChild {
  return {
    childId,
    name: `Con ${ordinal}`,
    className: "10A1",
    ordinal,
    avatar: "CN",
    color: "primary",
  };
}

const RECORD_VM: AcademicRecordScreenVM = {
  role: "parent",
  studentId: "st-1",
  record: null,
  selectedYearId: "2025-2026",
  error: null,
};

beforeEach(() => {
  buildAcademicRecordVM.mockReset();
  execute.mockReset();
  buildAcademicRecordVM.mockResolvedValue(RECORD_VM);
  execute.mockResolvedValue({ ok: true, data: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function renderPage(studentId = "st-1", year?: string) {
  const { default: Page } = await import("./page");
  // biome-ignore lint/suspicious/noExplicitAny: RSC returns a React element; reading its props is the assertion surface.
  return (await Page({
    params: Promise.resolve({ tenant: "acme", studentId }),
    searchParams: Promise.resolve({ year }),
    // biome-ignore lint/suspicious/noExplicitAny: same.
  } as any)) as any;
}

describe("parent academic-record page — child selector composition", () => {
  it("populates childSwitcher for a parent with 2+ linked children, active = the route's studentId", async () => {
    execute.mockResolvedValue({
      ok: true,
      data: [child("st-1", 1), child("st-2", 2)],
    });

    const el = await renderPage("st-2");

    expect(el.props.vm.childSwitcher).toEqual({
      childList: [child("st-1", 1), child("st-2", 2)],
      activeChildId: "st-2",
    });
  });

  it("omits the selector for a parent with a single linked child", async () => {
    execute.mockResolvedValue({ ok: true, data: [child("st-1", 1)] });

    const el = await renderPage();

    expect(el.props.vm.childSwitcher).toBeUndefined();
  });

  it("keeps the record when the child-list read FAILS, and surfaces no error for it", async () => {
    // Fail-soft (AC #3): a secondary read's loss costs the selector only. It
    // must not be laundered into `vm.error`, which the screen renders as a
    // full-screen alert — the parent would be told their child's record is
    // unavailable when it is right there.
    execute.mockResolvedValue({ ok: false, error: { type: "unknown" } });

    const el = await renderPage();

    expect(el.props.vm.childSwitcher).toBeUndefined();
    expect(el.props.vm.error).toBeNull();
    expect(el.props.vm.selectedYearId).toBe("2025-2026");
  });

  it("keeps the record when the child-list read REJECTS (including the DI factory)", async () => {
    execute.mockRejectedValue(new Error("boom"));

    const el = await renderPage();

    expect(el.props.vm.childSwitcher).toBeUndefined();
    expect(el.props.vm.error).toBeNull();
  });

  it("renders the selector with a NON-matching active tab for a foreign studentId", async () => {
    // AC #4: BE answers 403 → `forbidden`, unchanged. The selector still shows
    // (the parent does have children) with nothing selected — no client-side
    // membership guess, no silent retarget to a child we picked.
    buildAcademicRecordVM.mockResolvedValue({
      ...RECORD_VM,
      studentId: "foreign-9",
      error: "forbidden",
    });
    execute.mockResolvedValue({
      ok: true,
      data: [child("st-1", 1), child("st-2", 2)],
    });

    const el = await renderPage("foreign-9");

    expect(el.props.vm.error).toBe("forbidden");
    expect(el.props.vm.childSwitcher.activeChildId).toBe("foreign-9");
    expect(
      el.props.vm.childSwitcher.childList.some(
        (c: ChildSwitcherChild) => c.childId === "foreign-9",
      ),
    ).toBe(false);
  });

  it("threads the tenant-scoped children base path to the container", async () => {
    const el = await renderPage();

    expect(el.props.basePath).toBe("/t/acme/parent/children");
  });

  it("still forwards the ?year param of the CURRENT child to the record read", async () => {
    await renderPage("st-1", "2024-2025");

    expect(buildAcademicRecordVM).toHaveBeenCalledWith({
      role: "parent",
      studentId: "st-1",
      year: "2024-2025",
    });
  });
});
