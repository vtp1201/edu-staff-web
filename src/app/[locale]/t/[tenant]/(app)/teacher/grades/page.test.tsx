/**
 * RSC composition proof for the TEACHER grade-entry route (US-E18.44).
 *
 * Why this file exists: the DEFAULT load of this route has no query params, so
 * the VM is built with `key === null`. That no-selection branch used to hand
 * locally-defined async closures to a Client Component, which Next.js rejects at
 * runtime ("Functions cannot be passed directly to Client Components unless you
 * explicitly expose it by marking it with 'use server'") → HTTP 500 on the very
 * page a teacher must open to read a rejection reason (AC-1). Neither `tsc`,
 * `bun build`, nor a Storybook story can catch that — the closures type-check
 * perfectly and Storybook never crosses an RSC boundary. So the regression lock
 * is this test: the no-selection VM's mutations must be the REAL Server Action
 * module exports (bound to a placeholder key), never local functions.
 *
 * Same technique as `principal/grade-book/page.test.tsx`: the repo's vitest env
 * is `node` with no renderer for async server components, so the page element is
 * awaited and the props it hands the client screen are asserted.
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
  // The page now takes the whole calendar context so it can DEFAULT the term.
  resolveCurrentTermContext: async () => ({
    termId: "HK1",
    termName: "Học kỳ 1",
    academicYearLabel: "2025-2026",
  }),
  // Real terms feed the picker (its options used to be hardcoded HK1/HK2).
  resolveTermNames: async () => new Map([["HK1", "Học kỳ 1"]]),
}));

const saveScoreAction = vi.fn(async () => ({ ok: true }) as const);
const submitScoresAction = vi.fn(
  async () => ({ ok: true, result: { submitted: [], failed: [] } }) as const,
);
vi.mock("./actions", () => ({
  saveScoreAction: (...args: unknown[]) =>
    (saveScoreAction as (...a: unknown[]) => unknown)(...args),
  submitScoresAction: (...args: unknown[]) =>
    (submitScoresAction as (...a: unknown[]) => unknown)(...args),
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
          rejection: {
            reason: "Sai điểm cuối kỳ",
            rejectedBy: "admin-1",
            rejectedAt: "2026-08-05T02:00:00Z",
          },
        },
      },
      average: 6,
    },
  ],
  publishMode: "ADMIN_APPROVAL",
};

const FULL_SELECTION = {
  classId: "class-001",
  subjectId: "subj-toan-10",
  term: "HK1",
};

async function renderVm(
  sp: { classId?: string; subjectId?: string; term?: string } = FULL_SELECTION,
): Promise<GradeEntryScreenVM> {
  const { default: TeacherGradesPage } = await import("./page");
  const el = (await TeacherGradesPage({
    searchParams: Promise.resolve(sp),
  })) as ReactElement<{ vm: GradeEntryScreenVM }>;
  return el.props.vm;
}

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue(SHEET);
});

describe("TeacherGradesPage", () => {
  it("mounts TEACHER mode with the score-entry capabilities", async () => {
    const vm = await renderVm();
    expect(vm.viewerRole).toBe("teacher");
    if (vm.viewerRole !== "teacher") throw new Error("expected teacher mode");
    expect(typeof vm.saveScoreAction).toBe("function");
    expect(typeof vm.submitScoresAction).toBe("function");
  });

  it("grants NO reject capability to a teacher", async () => {
    const vm = await renderVm();
    // Not "undefined" — the field does not exist on the teacher VM at all.
    expect("rejectEntryAction" in vm).toBe(false);
  });

  it("surfaces the rejection carried by the sheet (AC-1 reopen path)", async () => {
    const vm = await renderVm();
    expect(vm.sheet?.rows[0].scores.ck.rejection?.reason).toBe(
      "Sai điểm cuối kỳ",
    );
  });

  it("binds both mutations to the selected key", async () => {
    const vm = await renderVm();
    if (vm.viewerRole !== "teacher") throw new Error("expected teacher mode");
    await vm.saveScoreAction("hs-001", "ck", 9);
    expect(saveScoreAction).toHaveBeenCalledWith(
      {
        classId: "class-001",
        subjectId: "subj-toan-10",
        termId: "HK1",
        academicYearLabel: "2025-2026",
      },
      "hs-001",
      "ck",
      9,
    );
  });

  // ─── the regression lock (MUST-FIX 1) ──────────────────────────────────────

  it("defaults to the first class-subject and the current term when the URL says nothing", async () => {
    // Every parameter here is a uuid in real mode, so an unselected sheet was a
    // screen the teacher could only fill by walking three dropdowns.
    const vm = await renderVm({});
    expect(vm.selectedClassId).toBe("class-001");
    expect(vm.selectedSubjectId).toBe("subj-toan-10");
    expect(vm.selectedTerm).toBe("HK1");
    expect(execute).toHaveBeenCalledWith({
      classId: "class-001",
      subjectId: "subj-toan-10",
      termId: "HK1",
      academicYearLabel: "2025-2026",
    });
    expect(vm.sheet).toEqual(SHEET);
  });

  it("still passes the REAL Server Actions bound to the resolved key (never local closures)", async () => {
    const vm = await renderVm({});
    if (vm.viewerRole !== "teacher") throw new Error("expected teacher mode");

    // A locally-defined closure would resolve without ever reaching the action
    // module — and would 500 the route the moment Next.js tried to serialize it.
    const key = {
      classId: "class-001",
      subjectId: "subj-toan-10",
      termId: "HK1",
      academicYearLabel: "2025-2026",
    };
    await vm.saveScoreAction("hs-001", "ck", 9);
    expect(saveScoreAction).toHaveBeenCalledWith(key, "hs-001", "ck", 9);

    await vm.submitScoresAction([{ studentId: "hs-001", columnId: "ck" }]);
    expect(submitScoresAction).toHaveBeenCalledWith(key, [
      { studentId: "hs-001", columnId: "ck" },
    ]);
  });

  it("surfaces a typed failure key instead of throwing", async () => {
    execute.mockResolvedValue({ type: "forbidden" });
    const vm = await renderVm();
    expect(vm.error).toBe("forbidden");
    expect(vm.sheet).toBeNull();
  });
});
