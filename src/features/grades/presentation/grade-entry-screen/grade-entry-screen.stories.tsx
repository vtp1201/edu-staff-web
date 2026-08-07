import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  AssessmentScheme,
  GradeCell,
  GradeEntryStatus,
  GradeSheet,
  StudentScoreRow,
} from "../../domain/entities/grade-sheet.entity";
import { GradeEntryScreen } from "./grade-entry-screen";
import type {
  ApproverGradeEntryVM,
  ClassSubjectOption,
  TeacherGradeEntryVM,
} from "./grade-entry-screen.i-vm";

const SCHEME: AssessmentScheme = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  termId: "HK1",
  columns: [
    { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
    { id: "gk", type: "GK", label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

const CLASS_SUBJECTS: ClassSubjectOption[] = [
  {
    classId: "class-001",
    subjectId: "subj-toan-10",
    className: "10A1",
    subjectName: "Toán",
  },
  {
    classId: "class-002",
    subjectId: "subj-toan-10",
    className: "10A2",
    subjectName: "Toán",
  },
];

function cell(
  value: number | null,
  status: GradeEntryStatus = "DRAFT",
): GradeCell {
  return { value, status };
}

function sheet(
  rows: StudentScoreRow[],
  publishMode: GradeSheet["publishMode"] = "SELF_PUBLISH",
): GradeSheet {
  return {
    classId: "class-001",
    subjectId: "subj-toan-10",
    termId: "HK1",
    academicYearLabel: "2025-2026",
    scheme: SCHEME,
    rows,
    publishMode,
  };
}

const POPULATED: StudentScoreRow[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: { tx: cell(8), gk: cell(7.5), ck: cell(9) },
    average: 8.2,
  },
  {
    studentId: "hs-002",
    studentName: "Trần Thị Bình",
    studentCode: "HS002",
    scores: { tx: cell(4), gk: cell(5), ck: cell(null) },
    average: null,
  },
  {
    studentId: "hs-003",
    studentName: "Lê Hoàng Cường",
    studentCode: "HS003",
    scores: { tx: cell(9), gk: cell(9.5), ck: cell(10) },
    average: 9.6,
  },
];

function withStatus(status: GradeEntryStatus): StudentScoreRow[] {
  return POPULATED.map((r) => ({
    ...r,
    scores: Object.fromEntries(
      Object.entries(r.scores).map(([k, c]) => [k, { ...c, status }]),
    ),
  }));
}

const baseVM: TeacherGradeEntryVM = {
  viewerRole: "teacher",
  classSubjects: CLASS_SUBJECTS,
  selectedClassId: "class-001",
  selectedSubjectId: "subj-toan-10",
  selectedTerm: "HK1",
  sheet: sheet(POPULATED),
  error: null,
  saveScoreAction: async () => ({ ok: true }),
  submitScoresAction: async (targets) => ({
    ok: true,
    result: { submitted: targets, failed: [] },
  }),
};

const meta: Meta<typeof GradeEntryScreen> = {
  title: "Features/Grades/GradeEntryScreen",
  component: GradeEntryScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-[color:var(--edu-bg)]">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof GradeEntryScreen>;

export const Loading: Story = {
  args: { vm: { ...baseVM, sheet: null }, isLoading: true },
};

export const NoSelection: Story = {
  args: {
    vm: {
      ...baseVM,
      selectedClassId: null,
      selectedSubjectId: null,
      selectedTerm: null,
      sheet: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.gradeEntry.noSelection),
    ).toBeInTheDocument();
  },
};

export const WithScores: Story = {
  args: { vm: baseVM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nguyễn Văn An")).toBeInTheDocument();
    // average for An = 8.2, rendered colored
    await expect(canvas.getByText("8.2")).toBeInTheDocument();
    // editable inputs exist (3 students × 3 columns, all DRAFT)
    const inputs = canvas.getAllByRole("spinbutton");
    await expect(inputs.length).toBe(9);
  },
};

export const SubmitAllDrafts: Story = {
  args: { vm: baseVM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitBtn = canvas.getByRole("button", {
      name: messages.gradeEntry.submitAllDraftsButton,
    });
    await expect(submitBtn).toBeEnabled();
    await userEvent.click(submitBtn);
    await expect(canvas.getByRole("status")).toBeInTheDocument();
  },
};

export const PublishedReadonly: Story = {
  args: { vm: { ...baseVM, sheet: sheet(withStatus("PUBLISHED")) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // no editable inputs when every cell is PUBLISHED
    await expect(canvas.queryAllByRole("spinbutton").length).toBe(0);
    await expect(
      canvas.getAllByText(messages.gradeCellStatus.published).length,
    ).toBeGreaterThan(0);
  },
};

export const PendingApproval: Story = {
  args: {
    vm: {
      ...baseVM,
      sheet: sheet(withStatus("PENDING_APPROVAL"), "ADMIN_APPROVAL"),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText(messages.gradeCellStatus.pendingApproval).length,
    ).toBeGreaterThan(0);
  },
};

export const Locked: Story = {
  args: { vm: { ...baseVM, sheet: sheet(withStatus("LOCKED")) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryAllByRole("spinbutton").length).toBe(0);
    await expect(
      canvas.getAllByText(messages.gradeCellStatus.locked).length,
    ).toBeGreaterThan(0);
  },
};

export const ValidationError: Story = {
  args: {
    vm: {
      ...baseVM,
      saveScoreAction: async () => ({
        ok: false,
        errorKey: "invalid-value",
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole("spinbutton");
    const first = inputs[0];
    if (!first) throw new Error("no cell input");
    await userEvent.clear(first);
    await userEvent.type(first, "15");
    await userEvent.tab();
    await expect(first).toHaveAttribute("aria-invalid", "true");
  },
};

export const PartialSubmitFailure: Story = {
  args: {
    vm: {
      ...baseVM,
      submitScoresAction: async (targets) => ({
        ok: true,
        result: {
          submitted: targets.slice(0, 1),
          failed: targets.slice(1).map((target) => ({
            target,
            failure: { type: "not-draft" as const },
          })),
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitBtn = canvas.getByRole("button", {
      name: messages.gradeEntry.submitAllDraftsButton,
    });
    await userEvent.click(submitBtn);
    const banner = canvas.getByRole("status");
    await expect(banner.textContent?.length).toBeGreaterThan(0);
  },
};

export const EmptyClass: Story = {
  args: { vm: { ...baseVM, sheet: sheet([]) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.gradeEntry.emptyClass),
    ).toBeInTheDocument();
  },
};

// ─── QA gate (fe-qa-playwright, US-E18.12) — new interaction tests closing
// gaps the tech-lead/a11y review only inspected statically ────────────────

/** 5-column single-row scheme so a bulk-submit fan-out has an exact,
 * assertable target count (2 succeed / 3 fail) — the A11Y-101 partial-failure
 * fix end-to-end, not just the banner text asserted by `PartialSubmitFailure`
 * above. */
const SCHEME_5COL: AssessmentScheme = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  termId: "HK1",
  columns: [
    { id: "c1", type: "TX", label: "Cột 1", count: 1, weight: 20 },
    { id: "c2", type: "TX", label: "Cột 2", count: 1, weight: 20 },
    { id: "c3", type: "TX", label: "Cột 3", count: 1, weight: 20 },
    { id: "c4", type: "TX", label: "Cột 4", count: 1, weight: 20 },
    { id: "c5", type: "TX", label: "Cột 5", count: 1, weight: 20 },
  ],
};

const ONE_ROW_5COL: StudentScoreRow[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: {
      c1: cell(8),
      c2: cell(7),
      c3: cell(6),
      c4: cell(9),
      c5: cell(5),
    },
    average: 7,
  },
];

export const PartialSubmitFailureCellIndicators: Story = {
  name: "Partial submit failure — per-cell aria-invalid indicators (A11Y-101)",
  args: {
    vm: {
      ...baseVM,
      sheet: {
        classId: "class-001",
        subjectId: "subj-toan-10",
        termId: "HK1",
        academicYearLabel: "2025-2026",
        scheme: SCHEME_5COL,
        rows: ONE_ROW_5COL,
        publishMode: "SELF_PUBLISH",
      },
      // 2 succeed (c1, c2) / 3 fail (c3, c4, c5) — exactly the fixed target
      // set the row-submit fans out, regardless of call order.
      submitScoresAction: async (targets) => ({
        ok: true,
        result: {
          submitted: targets.filter(
            (t) => t.columnId === "c1" || t.columnId === "c2",
          ),
          failed: targets
            .filter(
              (t) =>
                t.columnId === "c3" ||
                t.columnId === "c4" ||
                t.columnId === "c5",
            )
            .map((target) => ({
              target,
              failure: { type: "not-draft" as const },
            })),
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitRowBtn = canvas.getByRole("button", {
      name: messages.gradeEntry.submitRowButton,
    });
    await userEvent.click(submitRowBtn);

    // Aggregate banner reflects "2/5" (submitted/total), 3 failed.
    const banner = canvas.getByRole("status");
    await expect(banner.textContent).toContain("2/5");
    await expect(banner.textContent).toContain("3");

    // The 3 specific failed cells (c3/c4/c5) show aria-invalid + a visible
    // error message; the 2 succeeded cells (c1/c2) do NOT.
    const failedLabels = ["Cột 3", "Cột 4", "Cột 5"];
    for (const label of failedLabels) {
      const input = canvas.getByRole("spinbutton", {
        name: messages.gradeEntry.cellLabel
          .replace("{column}", label)
          .replace("{student}", "Nguyễn Văn An"),
      });
      await expect(input).toHaveAttribute("aria-invalid", "true");
      const describedBy = input.getAttribute("aria-describedby");
      if (!describedBy)
        throw new Error("expected aria-describedby on failed cell");
      const errorEl = canvasElement.querySelector(`#${describedBy}`);
      await expect(errorEl?.textContent?.length).toBeGreaterThan(0);
    }

    const succeededLabels = ["Cột 1", "Cột 2"];
    for (const label of succeededLabels) {
      const input = canvas.getByRole("spinbutton", {
        name: messages.gradeEntry.cellLabel
          .replace("{column}", label)
          .replace("{student}", "Nguyễn Văn An"),
      });
      await expect(input).toHaveAttribute("aria-invalid", "false");
    }
  },
};

export const SubmitButtonsDisabledWithoutDraft: Story = {
  name: "Row + bulk submit buttons disabled with zero DRAFT cells",
  args: { vm: { ...baseVM, sheet: sheet(withStatus("PUBLISHED")) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bulkBtn = canvas.getByRole("button", {
      name: messages.gradeEntry.submitAllDraftsButton,
    });
    await expect(bulkBtn).toBeDisabled();
    const rowBtns = canvas.getAllByRole("button", {
      name: messages.gradeEntry.submitRowButton,
    });
    for (const btn of rowBtns) {
      await expect(btn).toBeDisabled();
    }
  },
};

export const SubmitButtonsEnabledWithDraft: Story = {
  name: "Row + bulk submit buttons enabled with ≥1 DRAFT cell",
  args: { vm: baseVM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bulkBtn = canvas.getByRole("button", {
      name: messages.gradeEntry.submitAllDraftsButton,
    });
    await expect(bulkBtn).toBeEnabled();
    const rowBtns = canvas.getAllByRole("button", {
      name: messages.gradeEntry.submitRowButton,
    });
    for (const btn of rowBtns) {
      await expect(btn).toBeEnabled();
    }
  },
};

// ─── US-E18.44 (BE US-184) — ADMIN/MANAGER per-cell reject / request-revision ──

const REJECT_LABEL = (column: string, student: string) =>
  messages.gradeEntry.rejectCellLabel
    .replace("{column}", column)
    .replace("{student}", student);

/** Mirrors the approve control's `aria-label` template (US-E18.46). */
const APPROVE_LABEL = (column: string, student: string) =>
  messages.gradeEntry.approveCellLabel
    .replace("{column}", column)
    .replace("{student}", student);

/** One PENDING_APPROVAL row so the reject affordance has an exact target. */
const PENDING_ROWS: StudentScoreRow[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: {
      tx: { value: 8, status: "PENDING_APPROVAL" },
      gk: { value: 7.5, status: "PENDING_APPROVAL" },
      ck: { value: 9, status: "PENDING_APPROVAL" },
    },
    average: 8.2,
  },
];

/**
 * The ADMIN/MANAGER approver VM as mounted at `/principal/grade-book` and
 * `/admin/grade-book` (US-E18.44 routing fix). Note what is NOT here: no
 * `saveScoreAction`, no `submitScoresAction` — `ApproverGradeEntryVM` has no
 * such fields, so "an approver cannot edit a score" is a compile-time property
 * of these stories, not something the play function has to remember to check.
 */
function approverVm(
  over: Partial<ApproverGradeEntryVM> = {},
): ApproverGradeEntryVM {
  return {
    viewerRole: "approver",
    classSubjects: CLASS_SUBJECTS,
    selectedClassId: "class-001",
    selectedSubjectId: "subj-toan-10",
    selectedTerm: "HK1",
    sheet: sheet(PENDING_ROWS, "ADMIN_APPROVAL"),
    error: null,
    classLabel: "10A1",
    subjectLabel: "Toán",
    rejectEntryAction: async () => ({ ok: true }),
    approveEntryAction: async () => ({ ok: true }),
    // Default: the rollup loaded and found nothing — the quiet state, so the
    // reject/lock stories are not perturbed by an unrelated list.
    pendingApproval: {
      items: [],
      nextCursor: null,
      hasMore: false,
      error: null,
    },
    loadPendingApprovalPage: async () => ({
      ok: true,
      page: { items: [], nextCursor: null, hasMore: false },
    }),
    ...over,
  };
}

/** Two rollup batches, oldest first (the BE's tenant-wide triage order). */
const PENDING_BATCHES = [
  {
    classId: "class-001",
    subjectId: "subj-toan-10",
    termId: "HK1",
    pendingCount: 12,
    submittedAt: "2026-07-28T01:00:00.000Z",
  },
  {
    classId: "class-002",
    subjectId: "subj-toan-10",
    termId: "HK2",
    pendingCount: 3,
    submittedAt: "2026-07-30T03:15:00.000Z",
  },
];

const approverVM = approverVm();

/**
 * A TEACHER viewer's VM has no `rejectEntryAction`, so there is NO reject
 * control in the DOM at all — the affordance is absent, not disabled.
 */
export const TeacherHasNoRejectAffordance: Story = {
  name: "Reject — teacher viewer has no reject control (capability absent)",
  args: {
    vm: { ...baseVM, sheet: sheet(PENDING_ROWS, "ADMIN_APPROVAL") },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", {
        name: REJECT_LABEL("Thường xuyên", "Nguyễn Văn An"),
      }),
    ).toBeNull();
    await expect(
      canvas.queryAllByText(messages.gradeEntry.rejectCellButton).length,
    ).toBe(0);
  },
};

/** ADMIN/MANAGER viewer → a reject control per PENDING_APPROVAL cell. */
export const ApproverSeesRejectControls: Story = {
  name: "Reject — approver sees one reject control per pending cell",
  args: { vm: approverVM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = canvas.getAllByRole("button", {
      name: new RegExp(messages.gradeEntry.rejectCellButton, "i"),
    });
    await expect(buttons.length).toBe(3);
    for (const btn of buttons) {
      await expect(btn).toBeEnabled();
    }
  },
};

/** Full happy path: open the dialog, blank reason blocked, type, confirm, banner. */
export const RejectWithReasonSucceeds: Story = {
  name: "Reject — required reason, confirm, success banner",
  args: { vm: approverVM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", {
        name: REJECT_LABEL("Cuối kỳ", "Nguyễn Văn An"),
      }),
    );

    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();

    // Blank reason cannot be submitted (defense in depth alongside BE 422).
    const confirm = body.getByRole("button", {
      name: messages.gradeEntry.rejectConfirm,
    });
    await expect(confirm).toBeDisabled();

    await userEvent.type(
      body.getByLabelText(messages.gradeEntry.rejectReasonLabel),
      "Điểm cuối kỳ lệch với bài thi",
    );
    await expect(confirm).toBeEnabled();
    await userEvent.click(confirm);

    await expect(
      canvas.getByText(messages.gradeEntry.rejectSuccess),
    ).toBeInTheDocument();
  },
};

/** 409 from the server keeps the dialog open with an inline, non-generic error. */
export const RejectNotPendingApprovalError: Story = {
  name: "Reject — 409 not-pending-approval surfaces inline, dialog stays open",
  args: {
    vm: {
      ...approverVM,
      rejectEntryAction: async () => ({
        ok: false,
        errorKey: "not-pending-approval",
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", {
        name: REJECT_LABEL("Cuối kỳ", "Nguyễn Văn An"),
      }),
    );
    await body.findByRole("dialog");
    await userEvent.type(
      body.getByLabelText(messages.gradeEntry.rejectReasonLabel),
      "Sai điểm",
    );
    await userEvent.click(
      body.getByRole("button", { name: messages.gradeEntry.rejectConfirm }),
    );

    const alert = await body.findByRole("alert");
    await expect(alert).toHaveTextContent(
      messages.gradeEntry.errorNotPendingApproval,
    );
    await expect(body.getByRole("dialog")).toBeInTheDocument();
  },
};

/**
 * A DRAFT cell carrying a rejection renders the "rejected + why" indicator, so
 * it reads differently from a never-submitted DRAFT. The reason is rendered as
 * a TEXT NODE — the HTML-looking payload below must appear literally, proving
 * no markup is interpreted (no `dangerouslySetInnerHTML` on this path).
 */
const XSS_REASON = '<img src=x onerror="alert(1)">Sai điểm';

export const RejectedDraftIndicatorEscapesReason: Story = {
  name: "Reject — rejected DRAFT cell shows reason, escaped as text",
  args: {
    vm: {
      ...baseVM,
      sheet: sheet(
        [
          {
            ...POPULATED[0],
            scores: {
              tx: { value: 8, status: "DRAFT" },
              gk: { value: 7.5, status: "DRAFT" },
              ck: {
                value: 6,
                status: "DRAFT",
                rejection: {
                  reason: XSS_REASON,
                  rejectedBy: "admin-1",
                  rejectedAt: "2026-08-05T02:00:00Z",
                },
              },
            },
          },
        ],
        "ADMIN_APPROVAL",
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.gradeEntry.rejectedBadge),
    ).toBeInTheDocument();

    const reasonText = messages.gradeEntry.rejectedReason.replace(
      "{reason}",
      XSS_REASON,
    );
    const reasonEl = canvas.getByText(reasonText);
    await expect(reasonEl).toBeInTheDocument();
    // Escaped, not parsed: no injected element exists anywhere.
    await expect(canvasElement.querySelector("img")).toBeNull();
    await expect(reasonEl.innerHTML).not.toContain("<img");

    // The rejection reason is also announced with the editable cell.
    const input = canvas.getByRole("spinbutton", {
      name: messages.gradeEntry.cellLabel
        .replace("{column}", "Cuối kỳ")
        .replace("{student}", "Nguyễn Văn An"),
    });
    const describedBy = input.getAttribute("aria-describedby");
    if (!describedBy) throw new Error("expected aria-describedby");
    await expect(
      canvasElement.querySelector(`#${describedBy}`)?.textContent,
    ).toContain("Sai điểm");
  },
};

// ─── US-E18.44 routing fix — APPROVER mode (`/principal/grade-book`,
// `/admin/grade-book`). The reject affordance was previously mounted only on
// `/teacher/grades`, whose layout guard redirects the very roles allowed to use
// it; these stories exercise the mode the approver routes actually render, and
// the term-lock tests below MOVED here from `grade-book-screen.stories.tsx`
// together with the control. ──────────────────────────────────────────────────

/** DRAFT rows so "read-only" is proven on the one status a teacher COULD edit. */
const DRAFT_ROWS: StudentScoreRow[] = withStatus("DRAFT");

export const ApproverViewIsReadOnly: Story = {
  name: "Approver — no score input, no submit affordance anywhere",
  args: { vm: approverVm({ sheet: sheet(DRAFT_ROWS, "ADMIN_APPROVAL") }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // DRAFT cells are exactly what a teacher edits — an approver gets text.
    await expect(canvas.queryAllByRole("spinbutton").length).toBe(0);
    await expect(
      canvas.queryByRole("button", {
        name: messages.gradeEntry.submitAllDraftsButton,
      }),
    ).toBeNull();
    await expect(
      canvas.queryAllByRole("button", {
        name: messages.gradeEntry.submitRowButton,
      }).length,
    ).toBe(0);
    // The roster itself is still fully visible (US-E13.6 read-only AC).
    await expect(canvas.getByText("Nguyễn Văn An")).toBeInTheDocument();
    await expect(canvas.getByText("Trần Thị Bình")).toBeInTheDocument();
    await expect(canvas.getByText("Lê Hoàng Cường")).toBeInTheDocument();
  },
};

export const ApproverViewTitleAndRankDistribution: Story = {
  name: "Approver — approver title + five-band rank distribution (US-E13.6)",
  args: { vm: approverVm() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: messages.gradeEntry.titleApprover }),
    ).toBeInTheDocument();
    // The distribution region carried over from the read-only grade book.
    const region = canvas.getByRole("region", {
      name: messages.gradeBook.rankDistributionTitle,
    });
    await expect(region).toBeInTheDocument();
    await expect(
      within(region).getByText(messages.gradeBook.rankXuatSac),
    ).toBeInTheDocument();
  },
};

export const ApproverCanRejectFromTheApproverRoute: Story = {
  name: "Approver — reject a pending cell end-to-end on the approver route",
  args: { vm: approverVm() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", {
        name: REJECT_LABEL("Cuối kỳ", "Nguyễn Văn An"),
      }),
    );
    await body.findByRole("dialog");
    await userEvent.type(
      body.getByLabelText(messages.gradeEntry.rejectReasonLabel),
      "Điểm cuối kỳ lệch với bài thi",
    );
    await userEvent.click(
      body.getByRole("button", { name: messages.gradeEntry.rejectConfirm }),
    );
    await expect(
      canvas.getByText(messages.gradeEntry.rejectSuccess),
    ).toBeInTheDocument();
  },
};

/**
 * A11Y-001 — a `PENDING_APPROVAL` cell can ALSO carry a rejection: BE US-184
 * does not clear `rejection` when the teacher resubmits, so the approver's
 * read-only cell renders the stale "rejected + why" indicator right next to a
 * live reject button. That button must point at the reason (`aria-describedby`),
 * otherwise a screen-reader user hears "Từ chối" with no idea a previous
 * rejection is already displayed beside it. Scoped, not blanket: the two
 * rejection-free cells' buttons carry no `aria-describedby` at all.
 */
export const ApproverRejectButtonDescribedByStaleRejection: Story = {
  name: "Approver — reject button on a pending cell WITH a stale rejection is described by it (A11Y-001)",
  args: {
    vm: approverVm({
      sheet: sheet(
        [
          {
            ...POPULATED[0],
            scores: {
              tx: { value: 8, status: "PENDING_APPROVAL" },
              gk: { value: 7.5, status: "PENDING_APPROVAL" },
              ck: {
                value: 6,
                status: "PENDING_APPROVAL",
                rejection: {
                  reason: "Lần trước lệch với bài thi",
                  rejectedBy: "admin-1",
                  rejectedAt: "2026-08-05T02:00:00Z",
                },
              },
            },
          },
        ],
        "ADMIN_APPROVAL",
      ),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Both the stale rejection indicator AND a live reject control are present.
    await expect(
      canvas.getByText(messages.gradeEntry.rejectedBadge),
    ).toBeInTheDocument();

    const rejectBtn = canvas.getByRole("button", {
      name: REJECT_LABEL("Cuối kỳ", "Nguyễn Văn An"),
    });
    const describedBy = rejectBtn.getAttribute("aria-describedby");
    if (!describedBy)
      throw new Error("expected aria-describedby on the reject button");
    const reasonEl = canvasElement.querySelector(`#${describedBy}`);
    await expect(reasonEl?.textContent).toContain("Lần trước lệch với bài thi");

    // The rejection-free pending cells get no description — only the cell that
    // actually shows a reason references one.
    for (const column of ["Thường xuyên", "Giữa kỳ"]) {
      const btn = canvas.getByRole("button", {
        name: REJECT_LABEL(column, "Nguyễn Văn An"),
      });
      await expect(btn).not.toHaveAttribute("aria-describedby");
    }
  },
};

export const TeacherHasNoLockTermControl: Story = {
  name: "Teacher — no term-lock control (capability absent)",
  args: { vm: baseVM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", {
        name: messages.gradeBook.lockTermButton,
      }),
    ).toBeNull();
  },
};

export const LockTermButtonDisabledWithoutPublished: Story = {
  name: "Lock-term button disabled with zero PUBLISHED cells",
  args: {
    vm: approverVm({
      sheet: sheet(DRAFT_ROWS),
      lockTermAction: async () => ({ ok: true, lockedCount: 0 }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: messages.gradeBook.lockTermButton }),
    ).toBeDisabled();
  },
};

export const LockTermButtonEnabledWithPublished: Story = {
  name: "Lock-term button enabled with ≥1 PUBLISHED cell",
  args: {
    vm: approverVm({
      sheet: sheet(withStatus("PUBLISHED")),
      lockTermAction: async () => ({ ok: true, lockedCount: 0 }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: messages.gradeBook.lockTermButton }),
    ).toBeEnabled();
  },
};

export const LockTermConfirmSuccess: Story = {
  name: "Lock-term confirm success — dialog closes, banner shows count",
  args: {
    vm: approverVm({
      sheet: sheet(withStatus("PUBLISHED")),
      lockTermAction: async () => ({ ok: true, lockedCount: 3 }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: messages.gradeBook.lockTermButton }),
    );

    const dialog = within(canvasElement.ownerDocument.body);
    await expect(
      dialog.getByText(messages.gradeBook.lockTermConfirmTitle),
    ).toBeInTheDocument();
    await userEvent.click(
      dialog.getByRole("button", {
        name: messages.gradeBook.lockTermConfirmOk,
      }),
    );

    // Dialog closes on success (Radix exit-animation timing — wait it out).
    await waitFor(() =>
      expect(
        dialog.queryByText(messages.gradeBook.lockTermConfirmTitle),
      ).not.toBeInTheDocument(),
    );
    // An approver screen mounts TWO live regions: this banner and the rollup's
    // (empty) load-more announcer (A11Y-046-02) — pick the one that spoke.
    const banner = canvas
      .getAllByRole("status")
      .find((el) => el.textContent?.includes("3"));
    await expect(banner).toBeDefined();
  },
};

export const LockTermConfirmFailureStaysOpen: Story = {
  name: "Lock-term confirm failure — dialog stays open, shows errorSlot (A11Y-102)",
  args: {
    vm: approverVm({
      sheet: sheet(withStatus("PUBLISHED")),
      lockTermAction: async () => ({ ok: false, errorKey: "network-error" }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: messages.gradeBook.lockTermButton }),
    );
    const dialog = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      dialog.getByRole("button", {
        name: messages.gradeBook.lockTermConfirmOk,
      }),
    );

    // A11Y-102: dialog must STAY open and surface its own errorSlot content.
    await expect(
      dialog.getByText(messages.gradeBook.lockTermConfirmTitle),
    ).toBeInTheDocument();
    const alert = dialog.getByRole("alert");
    await expect(alert.textContent).toContain(
      messages.gradeBook.errorNetworkError,
    );
    // transient tone → retry control present.
    await expect(
      dialog.getByRole("button", { name: messages.Common.confirmDialog.retry }),
    ).toBeInTheDocument();
  },
};

export const LockTermConfirmFailureForbiddenNoRetry: Story = {
  name: "Lock-term confirm forbidden failure — no retry, confirm disabled",
  args: {
    vm: approverVm({
      sheet: sheet(withStatus("PUBLISHED")),
      lockTermAction: async () => ({ ok: false, errorKey: "forbidden" }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: messages.gradeBook.lockTermButton }),
    );
    const dialog = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      dialog.getByRole("button", {
        name: messages.gradeBook.lockTermConfirmOk,
      }),
    );

    await expect(
      dialog.getByText(messages.gradeBook.lockTermConfirmTitle),
    ).toBeInTheDocument();
    const alert = dialog.getByRole("alert");
    await expect(alert.textContent).toContain(
      messages.gradeBook.errorForbidden,
    );
    // forbidden tone → no retry button, confirm itself force-disabled.
    await expect(
      dialog.queryByRole("button", {
        name: messages.Common.confirmDialog.retry,
      }),
    ).not.toBeInTheDocument();
    await expect(
      dialog.getByRole("button", {
        name: messages.gradeBook.lockTermConfirmOk,
      }),
    ).toBeDisabled();
  },
};

// ─── US-E18.46 — pending-approval rollup + approve action ───────────────────

/**
 * The discovery list an approver lands on: which class-subject-term tuples have
 * pending work, oldest first, with the count and how long each has waited.
 */
export const PendingRollupListsBatches: Story = {
  name: "Rollup — approver sees the tenant-wide pending list, oldest first",
  args: {
    vm: approverVm({
      pendingApproval: {
        items: PENDING_BATCHES,
        nextCursor: null,
        hasMore: false,
        error: null,
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = canvas.getAllByRole("button", { name: /Mở bảng điểm/ });
    await expect(rows.length).toBe(2);
    // Order is the server's, not a client re-sort: the oldest batch is first.
    await expect(rows[0]).toHaveAccessibleName(/10A1/);
    await expect(rows[1]).toHaveAccessibleName(/10A2/);
  },
};

/** Clicking a row jumps the picker straight to that class-subject-term tuple. */
export const PendingRollupRowJumpsToTuple: Story = {
  name: "Rollup — clicking a row selects that class-subject-term",
  args: {
    onSelectionChange: fn(),
    vm: approverVm({
      pendingApproval: {
        items: PENDING_BATCHES,
        nextCursor: null,
        hasMore: false,
        error: null,
      },
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Mở bảng điểm/ })[1],
    );
    // All THREE parts of the tuple in one navigation — the whole point is that
    // the approver never has to assemble the selection by hand.
    await waitFor(() =>
      expect(args.onSelectionChange).toHaveBeenCalledWith({
        classId: "class-002",
        subjectId: "subj-toan-10",
        term: "HK2",
      }),
    );
  },
};

/** Nothing pending is a legitimate, explicitly-worded state — not a blank gap. */
export const PendingRollupEmpty: Story = {
  name: "Rollup — empty state when nothing is waiting",
  args: { vm: approverVm() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.gradeEntry.pendingEmpty),
    ).toBeInTheDocument();
  },
};

/**
 * A failed rollup read degrades ONLY its own section (the sheet below still
 * renders) and offers a retry that re-reads the first page.
 */
export const PendingRollupErrorRetries: Story = {
  name: "Rollup — failed read shows a retryable error, sheet still renders",
  args: {
    vm: approverVm({
      pendingApproval: {
        items: [],
        nextCursor: null,
        hasMore: false,
        error: "network-error",
      },
      loadPendingApprovalPage: async () => ({
        ok: true,
        page: { items: PENDING_BATCHES, nextCursor: null, hasMore: false },
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.gradeEntry.errorNetworkError),
    ).toBeInTheDocument();
    // The grade sheet is untouched by the rollup's failure.
    await expect(canvas.getByText("Nguyễn Văn An")).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: messages.gradeEntry.pendingRetry }),
    );
    await waitFor(() =>
      expect(
        canvas.getAllByRole("button", { name: /Mở bảng điểm/ }).length,
      ).toBe(2),
    );
  },
};

/** The queue must never silently truncate: `hasMore` yields a load-more page. */
export const PendingRollupLoadsMore: Story = {
  name: "Rollup — load more appends the next page",
  args: {
    vm: approverVm({
      pendingApproval: {
        items: [PENDING_BATCHES[0]],
        nextCursor: "cur-2",
        hasMore: true,
        error: null,
      },
      loadPendingApprovalPage: async (cursor) => ({
        ok: true,
        page: {
          items: cursor === "cur-2" ? [PENDING_BATCHES[1]] : [],
          nextCursor: null,
          hasMore: false,
        },
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByRole("button", { name: /Mở bảng điểm/ }).length,
    ).toBe(1);
    await userEvent.click(
      canvas.getByRole("button", { name: messages.gradeEntry.pendingLoadMore }),
    );
    await waitFor(() =>
      expect(
        canvas.getAllByRole("button", { name: /Mở bảng điểm/ }).length,
      ).toBe(2),
    );
  },
};

/**
 * A teacher's VM has no `approveEntryAction` at all (it is not even a field on
 * `TeacherGradeEntryVM`), so no approve control exists in the DOM — absent, not
 * disabled.
 */
export const TeacherHasNoApproveAffordance: Story = {
  name: "Approve — teacher viewer has no approve control (capability absent)",
  args: { vm: { ...baseVM, sheet: sheet(PENDING_ROWS, "ADMIN_APPROVAL") } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", {
        name: APPROVE_LABEL("Cuối kỳ", "Nguyễn Văn An"),
      }),
    ).toBeNull();
  },
};

/** Approve is confirmed (one-way publish) but needs NO reason field. */
export const ApproverApprovesCell: Story = {
  name: "Approve — approver approves a pending cell end-to-end",
  args: { vm: approverVm() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", {
        name: APPROVE_LABEL("Cuối kỳ", "Nguyễn Văn An"),
      }),
    );
    const dialog = await body.findByRole("alertdialog");
    // No reason input: approval is unqualified, unlike reject.
    await expect(within(dialog).queryByRole("textbox")).toBeNull();
    await userEvent.click(
      within(dialog).getByRole("button", {
        name: messages.gradeEntry.approveConfirm,
      }),
    );
    await expect(
      canvas.getByText(messages.gradeEntry.approveSuccess),
    ).toBeInTheDocument();
  },
};

/**
 * A raced approve (someone else already acted) keeps the dialog OPEN with a
 * `blocked`-tone message — re-clicking could only fail again, so the way out is
 * Cancel.
 */
export const ApproveNotPendingApprovalStaysOpen: Story = {
  name: "Approve — 409 not-pending-approval keeps the dialog open with the reason",
  args: {
    vm: approverVm({
      approveEntryAction: async () => ({
        ok: false,
        errorKey: "not-pending-approval",
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", {
        name: APPROVE_LABEL("Cuối kỳ", "Nguyễn Văn An"),
      }),
    );
    const dialog = await body.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", {
        name: messages.gradeEntry.approveConfirm,
      }),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText(messages.gradeEntry.errorNotPendingApproval),
      ).toBeInTheDocument(),
    );
    await expect(body.getByRole("alertdialog")).toBeInTheDocument();
  },
};
