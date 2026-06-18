import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { MOCK_EXAMS } from "../../infrastructure/repositories/mocks/exam.fixtures";
import { ExamListScreen } from "./exam-list";
import { ExamListSkeleton } from "./exam-list-skeleton";

const meta: Meta<typeof ExamListScreen> = {
  title: "Features/Exam/ExamList",
  component: ExamListScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExamListScreen>;

export const AllStatuses: Story = {
  args: { exams: MOCK_EXAMS },
};

export const FilterTabs: Story = {
  args: { exams: MOCK_EXAMS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const completedTab = canvas.getAllByRole("tab", { name: "Đã xong" })[0];
    if (completedTab) {
      await userEvent.click(completedTab);
      await expect(completedTab).toHaveAttribute("aria-selected", "true");
    }
  },
};

export const EmptyState: Story = {
  args: { exams: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Không có bài kiểm tra")).toBeInTheDocument();
  },
};

export const Loading: StoryObj<typeof ExamListSkeleton> = {
  render: () => <ExamListSkeleton />,
};
