import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  AssessmentScheme,
  GradePublishStatus,
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
  { id: "cs-001", label: "10A1 — Toán" },
  { id: "cs-002", label: "10A2 — Toán" },
];

function sheet(
  rows: StudentScoreRow[],
  publishMode: GradeSheet["publishMode"] = "SELF_PUBLISH",
): GradeSheet {
  return {
    classSubjectId: "cs-001",
    term: "HK1",
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
    scores: { tx: 8, gk: 7.5, ck: 9 },
    average: 8.2,
    publishStatus: "DRAFT",
  },
  {
    studentId: "hs-002",
    studentName: "Trần Thị Bình",
    studentCode: "HS002",
    scores: { tx: 4, gk: 5, ck: null },
    average: null,
    publishStatus: "DRAFT",
  },
  {
    studentId: "hs-003",
    studentName: "Lê Hoàng Cường",
    studentCode: "HS003",
    scores: { tx: 9, gk: 9.5, ck: 10 },
    average: 9.6,
    publishStatus: "DRAFT",
  },
];

function withStatus(status: GradePublishStatus): StudentScoreRow[] {
  return POPULATED.map((r) => ({ ...r, publishStatus: status }));
}

const baseVM: GradeEntryScreenVM = {
  classSubjects: CLASS_SUBJECTS,
  selectedCsId: "cs-001",
  selectedTerm: "HK1",
  sheet: sheet(POPULATED),
  error: null,
  saveScoreAction: async () => ({ ok: true }),
  publishAction: async () => ({ ok: true as const }),
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
      selectedCsId: null,
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
    // editable inputs exist (3 students × 3 columns)
    const inputs = canvas.getAllByRole("spinbutton");
    await expect(inputs.length).toBe(9);
  },
};

export const PublishConfirmDialog: Story = {
  args: { vm: baseVM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const publishBtn = canvas.getByRole("button", {
      name: messages.gradeEntry.publishButton,
    });
    await userEvent.click(publishBtn);
    const dialog = within(document.body);
    await expect(
      dialog.getByText(messages.gradeEntry.publishConfirmTitle),
    ).toBeInTheDocument();
  },
};

export const PublishedReadonly: Story = {
  args: { vm: { ...baseVM, sheet: sheet(withStatus("PUBLISHED")) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // no editable inputs when published
    await expect(canvas.queryAllByRole("spinbutton").length).toBe(0);
    await expect(
      canvas.getByText(messages.gradeEntry.published),
    ).toBeInTheDocument();
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
      canvas.getByText(messages.gradeEntry.pendingApproval),
    ).toBeInTheDocument();
  },
};

export const ValidationError: Story = {
  args: {
    vm: {
      ...baseVM,
      saveScoreAction: async () => ({
        ok: false,
        errorKey: "score-out-of-range",
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

export const EmptyClass: Story = {
  args: { vm: { ...baseVM, sheet: sheet([]) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.gradeEntry.emptyClass),
    ).toBeInTheDocument();
  },
};
