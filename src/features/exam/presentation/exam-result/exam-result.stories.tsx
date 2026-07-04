import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import {
  buildMockResult,
  MOCK_PENDING_ESSAY_RESULT,
} from "../../infrastructure/repositories/mocks/exam.fixtures";
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

const completedAfterEssayResult = {
  ...buildMockResult("exam-005"),
  status: "completed" as const,
  score: 8.3,
  passed: true,
  essayCount: 2,
  essayMax: 4,
  mcqScore: 6,
  mcqMax: 6,
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

export const Result_PendingEssay: Story = {
  args: { result: MOCK_PENDING_ESSAY_RESULT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("CHƯA CÓ ĐIỂM TỔNG")).toBeInTheDocument();
    await expect(
      canvas.getByText("Điểm tự luận đang chờ giáo viên chấm"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("Câu tự luận (chờ chấm)"),
    ).toBeInTheDocument();
  },
};

export const Result_CompletedAfterEssay: Story = {
  args: { result: completedAfterEssayResult },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByText("CHƯA CÓ ĐIỂM TỔNG"),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText("8.3")).toBeInTheDocument();
    await expect(canvas.getByText("ĐẠT")).toBeInTheDocument();
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

// US-E17.1 (OQ-003): at 375px the MCQ-stats grid uses the auto-fit
// minmax(200px) column class (1 column on mobile) with a 16px gap-4 gap.
const VIEWPORT_375 = {
  viewports: {
    mobile375: {
      name: "Mobile 375",
      styles: { width: "375px", height: "812px" },
      type: "mobile" as const,
    },
  },
  defaultViewport: "mobile375",
};

export const Viewport375: Story = {
  args: { result: passResult },
  parameters: { viewport: VIEWPORT_375 },
  play: async ({ canvasElement }) => {
    const grid = canvasElement.querySelector<HTMLElement>(
      '[class*="auto-fit"]',
    );
    await expect(grid).not.toBeNull();
    await expect(grid?.className).toContain(
      "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]",
    );
    await expect(grid?.className).toContain("gap-4");
  },
};
