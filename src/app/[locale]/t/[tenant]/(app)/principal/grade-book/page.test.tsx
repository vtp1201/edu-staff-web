/**
 * RSC composition proof for the PRINCIPAL grade view (US-E18.44).
 *
 * This is the reachability test the routing fix exists for: `/teacher/grades` is
 * gated by a strict-equality `role === "teacher"` layout, so a principal session
 * can never render it — the reject affordance had to be mounted on a route a
 * principal can actually reach. The repo's vitest env is `node` with no renderer
 * for async server components, so the page element is awaited and the props it
 * hands the client screen are asserted (same technique as US-E23.2/US-E13.10).
 */
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GradeSheet } from "@/features/grades/domain/entities/grade-sheet.entity";
import type { GradeEntryScreenVM } from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";

const execute = vi.fn();
const makeGetGradeSheetUseCase = vi.fn(async (_key: unknown) => ({ execute }));

vi.mock("@/bootstrap/di/grades.di", () => ({
  makeGetGradeSheetUseCase: (key: unknown) =>
    makeGetGradeSheetUseCase(key as never),
}));
vi.mock("@/bootstrap/lib/resolve-my-grade-subjects", () => ({
  resolveMyGradeSubjects: async () => [
    {
      classId: "class-001",
      subjectId: "subj-toan-10",
      className: "10A1",
      subjectName: "Toán",
    },
  ],
}));
vi.mock("@/bootstrap/lib/resolve-current-term", () => ({
  resolveCurrentAcademicYear: async () => "2025-2026",
}));
vi.mock("@/app/[locale]/t/[tenant]/(app)/admin/grade-book/actions", () => ({
  rejectEntryAction: vi.fn(async () => ({ ok: true })),
  lockTermAction: vi.fn(async () => ({ ok: true, lockedCount: 0 })),
}));

const SHEET: GradeSheet = {
  classId: "class-001",
  subjectId: "subj-toan-10",
  termId: "HK1",
  academicYearLabel: "2025-2026",
  scheme: {
    subjectId: "subj-toan-10",
    yearLabel: "2025-2026",
    termId: "HK1",
    columns: [
      { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 100 },
    ],
  },
  rows: [
    {
      studentId: "hs-001",
      studentName: "Nguyễn Văn An",
      studentCode: "HS001",
      scores: { ck: { value: 9, status: "PENDING_APPROVAL" } },
      average: 9,
    },
    {
      studentId: "hs-002",
      studentName: "Trần Thị Bình",
      studentCode: "HS002",
      scores: { ck: { value: null, status: "DRAFT" } },
      average: null,
    },
  ],
  publishMode: "ADMIN_APPROVAL",
};

async function renderVm(
  sp: { classId?: string; subjectId?: string; term?: string } = {
    classId: "class-001",
    subjectId: "subj-toan-10",
    term: "HK1",
  },
): Promise<GradeEntryScreenVM> {
  const { default: PrincipalGradeBookPage } = await import("./page");
  const el = (await PrincipalGradeBookPage({
    searchParams: Promise.resolve(sp),
  })) as ReactElement<{ vm: GradeEntryScreenVM }>;
  return el.props.vm;
}

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue(SHEET);
});

describe("PrincipalGradeBookPage", () => {
  it("reads the STAFF grade sheet (the only shape that can carry a rejection)", async () => {
    const vm = await renderVm();
    expect(makeGetGradeSheetUseCase).toHaveBeenCalledWith({
      classId: "class-001",
      subjectId: "subj-toan-10",
      termId: "HK1",
      academicYearLabel: "2025-2026",
    });
    expect(vm.sheet).toBe(SHEET);
  });

  it("mounts APPROVER mode with a reject capability — the reachability fix", async () => {
    const vm = await renderVm();
    expect(vm.viewerRole).toBe("approver");
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    expect(typeof vm.rejectEntryAction).toBe("function");
  });

  it("grants NO score-editing capability to an approver", async () => {
    const vm = await renderVm();
    // Not "undefined" — the fields do not exist on the approver VM at all.
    expect("saveScoreAction" in vm).toBe(false);
    expect("submitScoresAction" in vm).toBe(false);
  });

  it("keeps the full roster visible (existing read-only AC, US-E13.6)", async () => {
    const vm = await renderVm();
    expect(vm.sheet?.rows.map((r) => r.studentName)).toEqual([
      "Nguyễn Văn An",
      "Trần Thị Bình",
    ]);
  });

  it("resolves display labels for the lock confirmation from the picker", async () => {
    const vm = await renderVm();
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    expect(vm.classLabel).toBe("10A1");
    expect(vm.subjectLabel).toBe("Toán");
    expect(typeof vm.lockTermAction).toBe("function");
  });

  it("binds neither mutation before a full class-subject-term selection", async () => {
    const vm = await renderVm({});
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    expect(vm.lockTermAction).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
    expect(vm.sheet).toBeNull();
  });

  it("surfaces a typed failure key instead of throwing", async () => {
    execute.mockResolvedValue({ type: "forbidden" });
    const vm = await renderVm();
    expect(vm.error).toBe("forbidden");
    expect(vm.sheet).toBeNull();
  });
});
