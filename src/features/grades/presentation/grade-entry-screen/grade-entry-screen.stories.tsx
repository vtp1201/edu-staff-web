import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
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
  ClassSubjectOption,
  GradeEntryScreenVM,
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

const baseVM: GradeEntryScreenVM = {
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
