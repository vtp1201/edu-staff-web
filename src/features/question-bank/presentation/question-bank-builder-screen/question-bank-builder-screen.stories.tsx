import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { QuestionEntity } from "../../domain/entities/question.entity";
import { QuestionBankBuilderScreen } from "./question-bank-builder-screen";
import type { QuestionBankBuilderScreenVM } from "./question-bank-builder-screen.i-vm";

const SUBJECTS = [
  { id: "sub-math", name: "Toán học" },
  { id: "sub-phys", name: "Vật Lý" },
];

const draftQuestion: QuestionEntity = {
  id: "q-9",
  tenantId: "tn-1",
  authorId: "t-me",
  questionType: "ESSAY",
  subjectId: "sub-math",
  gradeLevel: "12",
  difficulty: "HARD",
  body: "Trình bày nguyên lý chồng chất điện trường.",
  expectedAnswer: null,
  status: "DRAFT",
  tags: ["Điện trường"],
  createdAt: "2026-05-10T00:00:00Z",
  updatedAt: "2026-05-18T00:00:00Z",
};

function baseVM(
  over: Partial<QuestionBankBuilderScreenVM> = {},
): QuestionBankBuilderScreenVM {
  return {
    initial: undefined,
    subjects: SUBJECTS,
    gradeOptions: ["10", "11", "12"],
    questionBankPath: "/vi/t/t1/teacher/question-bank",
    editPathPrefix: "/vi/t/t1/teacher/question-bank",
    saveQuestionAction: async (input) => ({
      ok: true,
      question: { ...draftQuestion, id: input.id ?? "q-new", body: input.body },
    }),
    publishAction: async (id) => ({
      ok: true,
      question: {
        ...draftQuestion,
        id,
        status: "PUBLISHED",
        publishedAt: "2026-07-02T00:00:00Z",
      },
    }),
    refetchAction: async (id) => ({
      ok: true,
      question: { ...draftQuestion, id, status: "PUBLISHED" },
    }),
    ...over,
  };
}

const meta: Meta<typeof QuestionBankBuilderScreen> = {
  title: "Features/QuestionBank/BuilderScreen",
  component: QuestionBankBuilderScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, retryDelay: 0 } },
      });
      return (
        <NextIntlClientProvider locale="vi" messages={messages}>
          <QueryClientProvider client={qc}>
            <div className="flex min-h-screen flex-col bg-background">
              <Story />
            </div>
          </QueryClientProvider>
        </NextIntlClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof QuestionBankBuilderScreen>;

/** Create mode — 3-option type selector (no MCQ), all fields enabled. */
export const Create_Success: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Dạng câu hỏi", { selector: "legend" }),
    ).toBeVisible();
    // 3 type options, none is MCQ.
    await expect(
      canvas.getByRole("button", { name: /Tự luận/, pressed: true }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /Trả lời ngắn/ }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /Điền khuyết/ }),
    ).toBeVisible();
    await expect(canvas.queryByText(/Trắc nghiệm|MCQ/)).not.toBeInTheDocument();
  },
};

/** Publish blocked when body invalid — inline body error, no dialog (FR-010). */
export const Create_PublishBlocked: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /Xuất bản/ }),
    );
    // Inline body error shown; the confirm dialog does NOT open.
    await expect(
      await canvas.findByText("Nội dung câu hỏi cần tối thiểu 4 ký tự."),
    ).toBeVisible();
    await expect(
      within(document.body).queryByText("Xuất bản câu hỏi này?"),
    ).not.toBeInTheDocument();
  },
};

/**
 * Blank expectedAnswer never gates publish (FR-007) — filling ONLY the body
 * enables the flow and opens the irreversible confirm dialog.
 */
export const Create_PublishConfirm: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText(/Nội dung câu hỏi/),
      "Một câu hỏi đủ dài để xuất bản.",
    );
    await userEvent.click(canvas.getByRole("button", { name: /Xuất bản/ }));
    // Irreversible confirm dialog (Radix AlertDialog → portal).
    const dialog = within(document.body);
    await expect(
      await dialog.findByText("Xuất bản câu hỏi này?"),
    ).toBeVisible();
    await expect(
      dialog.getByText(/không thể chuyển lại về trạng thái nháp/),
    ).toBeVisible();
  },
};

/** Edit mode — the 4 immutable fields are disabled (FR-009). */
export const Edit_ImmutableFieldsLocked: Story = {
  args: {
    vm: baseVM({ initial: draftQuestion, questionId: "q-9" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // questionType segmented buttons disabled.
    await expect(
      await canvas.findByRole("button", { name: /Tự luận/ }),
    ).toBeDisabled();
    // Body remains editable.
    await expect(canvas.getByLabelText(/Nội dung câu hỏi/)).toBeEnabled();
  },
};

/** Locked/read-only — PUBLISHED question, no Save/Publish CTA, locked banner. */
export const Locked_ReadOnly: Story = {
  args: {
    vm: baseVM({
      initial: {
        ...draftQuestion,
        status: "PUBLISHED",
        publishedAt: "2026-07-02T00:00:00Z",
      },
      questionId: "q-9",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Câu hỏi đã được xuất bản"),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Lưu nháp/ }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByLabelText(/Nội dung câu hỏi/)).toBeDisabled();
  },
};

/** Transient edit-route load failure — error state + retry (no redirect). */
export const Edit_LoadFailed: Story = {
  args: { vm: baseVM({ initial: undefined, loadFailed: true }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Không tải được danh sách câu hỏi"),
    ).toBeVisible();
  },
};

/** Save-draft success toast path (create). */
export const Create_SaveDraft: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText(/Nội dung câu hỏi/),
      "Nội dung nháp hợp lệ.",
    );
    await userEvent.click(canvas.getByRole("button", { name: /Lưu nháp/ }));
    // Unsaved indicator clears after a successful save.
    await waitFor(() =>
      expect(canvas.queryByText("Chưa lưu")).not.toBeInTheDocument(),
    );
  },
};
