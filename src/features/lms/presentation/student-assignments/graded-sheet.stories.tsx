import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AssignmentEntity } from "@/features/lms/domain/entities/assignment.entity";
import { GradedSheet } from "./graded-sheet";

const iso = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

const BASE: AssignmentEntity = {
  id: "g1",
  title: "Kiểm tra 15 phút — Hàm số bậc nhất",
  description: "8 câu trắc nghiệm.",
  subject: "Toán học",
  className: "10A1",
  teacherName: "Nguyễn Văn A",
  tone: "primary",
  dueDate: iso(-10),
  status: "graded",
  submittedAt: iso(-11),
  gradedAt: iso(-9),
  score: 9,
  maxScore: 10,
  teacherComment: "Bài làm tốt, trình bày rõ ràng.",
  fileName: "bai.pdf",
  answerText: null,
  gradedFileName: "nhan-xet.pdf",
};

const body = () => within(document.body);

const meta: Meta<typeof GradedSheet> = {
  title: "Features/LMS/GradedSheet",
  component: GradedSheet,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: fn() },
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="vi"
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <Story />
        <Toaster />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GradedSheet>;

export const HighScoreWithComment: Story = {
  args: { assignment: BASE },
  play: async () => {
    await expect(body().getByText("9/10")).toBeInTheDocument();
    await expect(
      body().getByText("Bài làm tốt, trình bày rõ ràng."),
    ).toBeInTheDocument();
    await expect(
      body().getByText("Đã nộp lúc", { exact: false }),
    ).toBeInTheDocument();
  },
};

export const EmptyCommentFallback: Story = {
  args: { assignment: { ...BASE, teacherComment: "", gradedFileName: null } },
  play: async () => {
    await expect(
      body().getByText("Giáo viên chưa để lại nhận xét."),
    ).toBeInTheDocument();
  },
};

export const NoGradedFile: Story = {
  args: { assignment: { ...BASE, gradedFileName: null } },
  play: async () => {
    await expect(
      body().queryByRole("button", {
        name: "Tải xuống tệp giáo viên đính kèm",
      }),
    ).not.toBeInTheDocument();
  },
};

export const MockDownloadToast: Story = {
  args: { assignment: BASE },
  play: async () => {
    await userEvent.click(
      body().getByRole("button", { name: "Tải xuống tệp giáo viên đính kèm" }),
    );
    await waitFor(() =>
      expect(
        body().getByText("Đây là bản demo — không có tệp thật để tải."),
      ).toBeInTheDocument(),
    );
  },
};

export const LowScoreTone: Story = {
  args: { assignment: { ...BASE, score: 4, maxScore: 10 } },
  play: async () => {
    await expect(body().getByText("4/10")).toBeInTheDocument();
  },
};

/** AC-1178.3 — mid-range score (neither ≥8 success nor <5 error) renders the
 *  text-primary tone. Verified by CLASS, not just the numeric text, since a
 *  wrong tone with the right number would otherwise pass silently. */
export const MidRangeScoreTone: Story = {
  args: { assignment: { ...BASE, score: 6, maxScore: 10 } },
  play: async () => {
    const chip = body().getByText("6/10");
    // Neither success nor error tone classes present (StatusBadge tone map).
    await expect(chip.closest("span")).not.toHaveClass(
      "bg-edu-success/15",
      "text-edu-success-text",
    );
    await expect(chip.closest("span")).not.toHaveClass(
      "bg-edu-error/15",
      "text-edu-error-text",
    );
    await expect(chip.closest("span")).toHaveClass("text-edu-text-primary");
  },
};

/** NFR-001/AC-1178.10 — Escape closes the graded sheet (dialog contract
 *  shared with the submit sheet). */
export const EscapeClosesTheGradedSheet: Story = {
  args: { assignment: BASE, onOpenChange: fn() },
  play: async ({ args }) => {
    await body().findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};
