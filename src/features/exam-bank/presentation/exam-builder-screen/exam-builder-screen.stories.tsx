import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import { MOCK_SUBJECTS } from "../../infrastructure/repositories/mocks/fixtures";
import { ExamBuilderScreen } from "./exam-builder-screen";
import type { ExamBuilderScreenVM } from "./exam-builder-screen.i-vm";

const baseActions = {
  saveDraftAction: async () => ({ ok: true }) as const,
  createExamAction: async () => ({ ok: true, id: "e-new" }) as const,
  publishExamAction: async () => ({ ok: true }) as const,
};

function detailWith(
  questions: ExamBankDetail["questions"],
  title = "Đề thi nháp",
): ExamBankDetail {
  return {
    id: "e-draft",
    title,
    subjectId: "s-math",
    subjectName: "Toán",
    teacherId: "u-teacher-1",
    teacherName: "Nguyễn Văn An",
    totalQuestions: questions.length,
    durationMinutes: 30,
    maxAttempts: 1,
    status: "draft",
    createdAt: "2026-06-10",
    questions,
  };
}

const blankQuestion: ExamBankDetail["questions"][number] = {
  id: "q-blank",
  index: 0,
  content: "",
  options: [
    { id: "A", text: "" },
    { id: "B", text: "" },
    { id: "C", text: "" },
    { id: "D", text: "" },
  ],
  correctOptionId: "",
  difficulty: "medium",
  subjectId: "s-math",
};

const filledQuestion: ExamBankDetail["questions"][number] = {
  id: "q-filled",
  index: 0,
  content: "Thủ đô của Việt Nam là?",
  options: [
    { id: "A", text: "TP. Hồ Chí Minh" },
    { id: "B", text: "Hà Nội" },
    { id: "C", text: "Đà Nẵng" },
    { id: "D", text: "Huế" },
  ],
  correctOptionId: "B",
  difficulty: "easy",
  subjectId: "s-math",
};

const meta: Meta<typeof ExamBuilderScreen> = {
  title: "Features/ExamBank/ExamBuilderScreen",
  component: ExamBuilderScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="flex h-screen flex-col bg-background">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExamBuilderScreen>;

const baseProps: ExamBuilderScreenVM = {
  subjects: MOCK_SUBJECTS,
  ...baseActions,
};

/** AC-3: one blank question in list, MCQ editor empty. */
export const Builder_AddQuestion: Story = {
  args: { ...baseProps, initial: detailWith([blankQuestion]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Câu hỏi \(1\)/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/Nội dung câu hỏi/i)).toHaveValue("");
  },
};

/** AC-4: question fully filled, editor reflects content. */
export const Builder_MCQEdit: Story = {
  args: { ...baseProps, initial: detailWith([filledQuestion]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/Nội dung câu hỏi/i)).toHaveValue(
      "Thủ đô của Việt Nam là?",
    );
  },
};

/** AC-6: publish attempt with invalid question → publish disabled + error highlight. */
export const Builder_Validation: Story = {
  args: { ...baseProps, initial: detailWith([blankQuestion]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const publishBtn = canvas.getByRole("button", { name: /^Publish$/i });
    await expect(publishBtn).toBeDisabled();
    await expect(
      canvas.getByLabelText(/Câu hỏi này còn thiếu thông tin/i),
    ).toBeInTheDocument();
  },
};

/** AC-8: publish confirm dialog open after clicking Publish on a valid exam. */
export const PublishConfirm: Story = {
  args: { ...baseProps, initial: detailWith([filledQuestion]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const publishBtn = canvas.getByRole("button", { name: /^Publish$/i });
    await expect(publishBtn).toBeEnabled();
    await userEvent.click(publishBtn);
    const dialog = within(document.body);
    await expect(
      await dialog.findByText(/Publish đề thi này\?/i),
    ).toBeInTheDocument();
  },
};
