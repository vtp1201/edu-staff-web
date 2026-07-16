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
