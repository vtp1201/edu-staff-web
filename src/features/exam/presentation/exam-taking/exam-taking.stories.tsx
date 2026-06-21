import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import {
  buildMockMixedQuestions,
  buildMockQuestions,
  MOCK_EXAM,
} from "../../infrastructure/repositories/mocks/exam.fixtures";
import { ExamTakingScreen } from "./exam-taking";
import { ExamTakingTimer } from "./exam-taking-timer";

const exam = MOCK_EXAM;
const questions = buildMockQuestions(8);
// Fixed startedAt so the timer is deterministic in interaction tests.
const FIXED_START = 1_700_000_000_000;

const meta: Meta<typeof ExamTakingScreen> = {
  title: "Features/Exam/ExamTaking",
  component: ExamTakingScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExamTakingScreen>;

export const AnswerFlow: Story = {
  args: { exam, questions, startedAt: Date.now(), onSubmit: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const optionA = canvas.getByRole("button", { name: "Chọn đáp án A" });
    await userEvent.click(optionA);
    await expect(optionA).toHaveAttribute("aria-pressed", "true");
  },
};

export const FlaggedQuestion: Story = {
  args: { exam, questions, startedAt: Date.now(), onSubmit: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Đánh dấu" }));
    await expect(
      canvas.getByRole("button", { name: "Bỏ đánh dấu" }),
    ).toBeInTheDocument();
  },
};

export const SubmitModal: Story = {
  args: { exam, questions, startedAt: Date.now(), onSubmit: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Nộp bài" }));
    const dialog = within(document.body);
    await expect(dialog.getByText("Xác nhận nộp bài")).toBeInTheDocument();
  },
};

const mixedQuestions = buildMockMixedQuestions(3, 1);

export const Taking_EssayQuestion: Story = {
  args: {
    exam,
    questions: mixedQuestions,
    startedAt: Date.now(),
    onSubmit: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Jump to the essay question (last in the navigator).
    await userEvent.click(canvas.getByRole("button", { name: "Câu 4" }));
    const textarea = canvas.getByRole("textbox");
    await expect(textarea).toBeInTheDocument();
    await expect(canvas.getByText("0/2000 ký tự")).toBeInTheDocument();
    await userEvent.type(textarea, "12345");
    await expect(canvas.getByText("5/2000 ký tự")).toBeInTheDocument();
  },
};

// Timer state stories — deterministic via injected `now`.
type TimerStory = StoryObj<typeof ExamTakingTimer>;

const timerMeta = (remainingSec: number) => ({
  startedAt: FIXED_START,
  durationMinutes: 60,
  onExpire: () => {},
  now: () => FIXED_START + (60 * 60 - remainingSec) * 1000,
});

export const TimerWarning: TimerStory = {
  render: () => <ExamTakingTimer {...timerMeta(420)} />,
};

export const TimerError: TimerStory = {
  render: () => <ExamTakingTimer {...timerMeta(120)} />,
};
