import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import {
  MOCK_EXAM,
  MOCK_EXAMS,
} from "../../infrastructure/repositories/mocks/exam.fixtures";
import { ExamBriefingScreen } from "./exam-briefing";

const meta: Meta<typeof ExamBriefingScreen> = {
  title: "Features/Exam/ExamBriefing",
  component: ExamBriefingScreen,
  parameters: { layout: "fullscreen" },
  args: { exam: MOCK_EXAM, onStart: () => {} },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExamBriefingScreen>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cta = canvas.getByRole("button", { name: "Bắt đầu làm bài ngay" });
    await expect(cta).toBeDisabled();
  },
};

export const Agreed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox"));
    const cta = canvas.getByRole("button", { name: "Bắt đầu làm bài ngay" });
    await expect(cta).toBeEnabled();
  },
};

const mixedExam = MOCK_EXAMS.find((e) => e.id === "exam-005") ?? MOCK_EXAM;

export const Briefing_MixedIndicator: Story = {
  args: { exam: mixedExam },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Bài thi kết hợp")).toBeInTheDocument();
    await expect(canvas.getByText("Trắc nghiệm + Tự luận")).toBeInTheDocument();
    await expect(
      canvas.getByText(/Phần tự luận sẽ được giáo viên chấm/),
    ).toBeInTheDocument();
  },
};
