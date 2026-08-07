/**
 * RSC composition proof for the ADMIN grade view (US-E18.44).
 *
 * `/admin/*` and `/principal/*` have SEPARATE strict-equality layout guards, so
 * they are genuinely two reachable routes and each is proven independently — an
 * ADMIN session can only ever land on this one.
 */
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GradeSheet } from "@/features/grades/domain/entities/grade-sheet.entity";
import type { GradeEntryScreenVM } from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";

const execute = vi.fn();
const makeGetGradeSheetUseCase = vi.fn(async (_key: unknown) => ({ execute }));
const pendingExecute = vi.fn();
const makeListPendingApprovalBatchesUseCase = vi.fn(async () => ({
  execute: pendingExecute,
}));

vi.mock("@/bootstrap/di/grades.di", () => ({
  makeGetGradeSheetUseCase: (key: unknown) =>
    makeGetGradeSheetUseCase(key as never),
  makeListPendingApprovalBatchesUseCase: () =>
    makeListPendingApprovalBatchesUseCase(),
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
vi.mock("./actions", () => ({
  rejectEntryAction: vi.fn(async () => ({ ok: true })),
  approveEntryAction: vi.fn(async () => ({ ok: true })),
  loadPendingApprovalPageAction: vi.fn(async () => ({
    ok: true,
    page: { items: [], nextCursor: null, hasMore: false },
  })),
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
      scores: {
        ck: {
          value: 6,
          status: "DRAFT",
          rejection: { reason: "Sai điểm", rejectedBy: "admin-1" },
        },
      },
      average: 6,
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
  const { default: AdminGradeBookPage } = await import("./page");
  const el = (await AdminGradeBookPage({
    searchParams: Promise.resolve(sp),
  })) as ReactElement<{ vm: GradeEntryScreenVM }>;
  return el.props.vm;
}

const PENDING_PAGE = {
  items: [
    {
      classId: "class-001",
      subjectId: "subj-toan-10",
      termId: "HK1",
      pendingCount: 12,
      submittedAt: "2026-07-28T01:00:00.000Z",
    },
  ],
  nextCursor: "cur-2",
  hasMore: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue(SHEET);
  pendingExecute.mockResolvedValue(PENDING_PAGE);
});

describe("AdminGradeBookPage", () => {
  it("mounts APPROVER mode with a reject capability", async () => {
    const vm = await renderVm();
    expect(vm.viewerRole).toBe("approver");
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    expect(typeof vm.rejectEntryAction).toBe("function");
    expect(typeof vm.lockTermAction).toBe("function");
  });

  it("grants NO score-editing capability to an approver", async () => {
    const vm = await renderVm();
    expect("saveScoreAction" in vm).toBe(false);
    expect("submitScoresAction" in vm).toBe(false);
  });

  /**
   * The whole point of moving this route onto the staff read shape: a rejection
   * survives the RSC → client hand-off, so the approver can see WHY a cell came
   * back. The read-only `GradeBookRow` path could not express this at all.
   */
  it("carries the staff-only rejection payload through to the screen", async () => {
    const vm = await renderVm();
    expect(vm.sheet?.rows[0].scores.ck.rejection?.reason).toBe("Sai điểm");
  });

  it("reads the staff sheet with the composed class-subject-term key", async () => {
    await renderVm();
    expect(makeGetGradeSheetUseCase).toHaveBeenCalledWith({
      classId: "class-001",
      subjectId: "subj-toan-10",
      termId: "HK1",
      academicYearLabel: "2025-2026",
    });
  });

  it("surfaces a typed failure key instead of throwing", async () => {
    execute.mockResolvedValue({ type: "network-error" });
    const vm = await renderVm();
    expect(vm.error).toBe("network-error");
    expect(vm.sheet).toBeNull();
  });

  // ─── US-E18.46 — rollup seed + approve capability ─────────────────────────

  it("mounts the approve capability alongside reject", async () => {
    const vm = await renderVm();
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    expect(typeof vm.approveEntryAction).toBe("function");
  });

  it("seeds the tenant-wide pending-approval rollup (no key — it discovers keys)", async () => {
    const vm = await renderVm();
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    expect(vm.pendingApproval).toEqual({ ...PENDING_PAGE, error: null });
    expect(makeListPendingApprovalBatchesUseCase).toHaveBeenCalledTimes(1);
    expect(pendingExecute).toHaveBeenCalledWith();
  });

  /**
   * The rollup is a SECONDARY read: its failure must degrade only its own
   * section, never the sheet (and never throw a 500 out of the RSC).
   */
  it("degrades the rollup to a failure key without touching the sheet", async () => {
    pendingExecute.mockResolvedValue({ type: "invalid-cursor" });
    const vm = await renderVm();
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    expect(vm.pendingApproval).toEqual({
      items: [],
      nextCursor: null,
      hasMore: false,
      error: "invalid-cursor",
    });
    expect(vm.sheet).not.toBeNull();
  });

  /**
   * The rollup must load even with NO class-subject-term selected — that state
   * is exactly when the approver needs to be told what to open.
   */
  it("loads the rollup with no selection at all", async () => {
    const vm = await renderVm({});
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    expect(vm.pendingApproval.items).toHaveLength(1);
  });

  /**
   * Guards the RSC-closure trap: a locally-defined `async () => …` prop passed
   * from a Server Component is a runtime 500 that tsc/build/Storybook all pass.
   * Invoking the prop proves it is the imported Server Action, not a stub.
   */
  it("hands the REAL rollup Server Action to the client (not a local closure)", async () => {
    const vm = await renderVm();
    if (vm.viewerRole !== "approver") throw new Error("expected approver mode");
    const { loadPendingApprovalPageAction } = await import("./actions");
    await vm.loadPendingApprovalPage("cur-2");
    expect(loadPendingApprovalPageAction).toHaveBeenCalledWith("cur-2");
  });
});
