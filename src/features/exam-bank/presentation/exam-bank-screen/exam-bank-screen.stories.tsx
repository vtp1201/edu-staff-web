import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ExamBankSummary } from "../../domain/entities/exam-bank-summary.entity";
import {
  MOCK_EXAM_BANK,
  MOCK_SUBJECTS,
  MOCK_TEACHERS,
} from "../../infrastructure/repositories/mocks/fixtures";
import { ExamBankScreen } from "./exam-bank-screen";
import type { ExamBankScreenVM } from "./exam-bank-screen.i-vm";

const EXAMS: ExamBankSummary[] = MOCK_EXAM_BANK.map(
  ({ questions, ...summary }) => ({
    ...summary,
    totalQuestions: questions.length,
  }),
);

const publishAction: ExamBankScreenVM["publishAction"] = async () => ({
  ok: true,
});
const deleteAction: ExamBankScreenVM["deleteAction"] = async () => ({
  ok: true,
});

const baseProps: ExamBankScreenVM = {
  exams: EXAMS,
  subjects: MOCK_SUBJECTS,
  teachers: MOCK_TEACHERS,
  viewerRole: "teacher",
  currentTeacherId: "u-teacher-1",
  createPath: "/teacher/exam-bank/create",
  editPathPrefix: "/teacher/exam-bank",
  publishAction,
  deleteAction,
};

const meta: Meta<typeof ExamBankScreen> = {
  title: "Features/ExamBank/ExamBankScreen",
  component: ExamBankScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-[color:var(--edu-bg)] p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExamBankScreen>;

/** AC-1: skeleton while loading. */
export const ExamList_Loading: Story = {
  args: { ...baseProps, isLoading: true } as ExamBankScreenVM & {
    isLoading: boolean;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByLabelText(/Đang tải danh sách đề thi/i),
    ).toBeInTheDocument();
  },
};

/** AC-2: 3 draft + 2 published cards rendered. */
export const ExamList_DraftAndPublished: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Kho đề thi/i }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText(/Nháp/i).length).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/Đã publish/i).length).toBeGreaterThan(0);
  },
};

/** AC-11: empty state with CTA. */
export const ExamList_EmptyState: Story = {
  args: { ...baseProps, exams: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Chưa có đề thi nào/i)).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /Tạo đề thi đầu tiên/i }),
    ).toBeInTheDocument();
  },
};

/** AC-9: admin read-only — no create button, no card action menus. */
export const AdminReadOnly_NotApplicable: Story = {
  args: {
    ...baseProps,
    viewerRole: "admin",
    createPath: "",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: /Tạo đề thi mới/i }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /Mở menu thao tác đề thi/i }),
    ).not.toBeInTheDocument();
  },
};
