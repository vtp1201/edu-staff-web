import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { buildMockResult } from "../../infrastructure/repositories/mocks/exam.fixtures";
import { ExamResultScreen } from "./exam-result";

const passResult = buildMockResult("exam-001"); // 0.75 ratio → 7.5 → passed
const failResult = {
  ...buildMockResult("exam-001"),
  score: 3.5,
  passed: false,
  correctCount: 7,
  incorrectCount: 12,
  skippedCount: 1,
};

const meta: Meta<typeof ExamResultScreen> = {
  title: "Features/Exam/ExamResult",
  component: ExamResultScreen,
  parameters: { layout: "fullscreen" },
  args: { onBackToList: () => {} },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExamResultScreen>;

export const Pass: Story = {
  args: { result: passResult },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("ĐẠT")).toBeInTheDocument();
  },
};

export const Fail: Story = {
  args: { result: failResult },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("CHƯA ĐẠT")).toBeInTheDocument();
  },
};

export const QuestionReview: Story = {
  args: { result: passResult },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const incorrectTab = canvas.getAllByRole("tab", { name: "Sai" })[0];
    if (incorrectTab) {
      await userEvent.click(incorrectTab);
      await expect(incorrectTab).toHaveAttribute("aria-selected", "true");
    }
  },
};
