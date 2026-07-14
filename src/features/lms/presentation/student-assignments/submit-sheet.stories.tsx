import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AssignmentEntity } from "@/features/lms/domain/entities/assignment.entity";
import { SubmitSheet } from "./submit-sheet";

const iso = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

const PENDING: AssignmentEntity = {
  id: "s1",
  title: "Giải phương trình bậc 2",
  description: "Hoàn thành 12 câu trang 62.",
  subject: "Toán học",
  className: "10A1",
  teacherName: "Nguyễn Văn A",
  tone: "primary",
  dueDate: iso(5),
  status: "pending",
  submittedAt: null,
  gradedAt: null,
  score: null,
  maxScore: null,
  teacherComment: null,
  fileName: null,
  answerText: null,
  gradedFileName: null,
};

const OVERDUE: AssignmentEntity = { ...PENDING, id: "s2", dueDate: iso(-4) };
const SUBMITTED: AssignmentEntity = {
  ...PENDING,
  id: "s3",
  status: "submitted",
  submittedAt: iso(-1),
  fileName: "bai-lam.docx",
  answerText: "Đây là bài làm đã nộp.",
};

const body = () => within(document.body);

const meta: Meta<typeof SubmitSheet> = {
  title: "Features/LMS/SubmitSheet",
  component: SubmitSheet,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onOpenChange: fn(),
    submitting: false,
    submitErrorKey: null,
    onSubmit: fn(),
  },
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

type Story = StoryObj<typeof SubmitSheet>;

export const AttachAndRemoveFile: Story = {
  args: { assignment: PENDING, mode: "edit" },
  play: async () => {
    const input = body().getByLabelText("Đính kèm tệp") as HTMLInputElement;
    const file = new File(["hi"], "bai-lam.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);
    await waitFor(() =>
      expect(body().getByText("bai-lam.pdf")).toBeInTheDocument(),
    );
    await userEvent.click(
      body().getByRole("button", { name: "Xoá tệp đính kèm" }),
    );
    await waitFor(() =>
      expect(body().queryByText("bai-lam.pdf")).not.toBeInTheDocument(),
    );
  },
};

export const OversizedFileBlocksSubmit: Story = {
  args: { assignment: PENDING, mode: "edit", onSubmit: fn() },
  play: async ({ args }) => {
    const input = body().getByLabelText("Đính kèm tệp") as HTMLInputElement;
    const big = new File(["x"], "qua-lon.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    await userEvent.upload(input, big);
    const submit = body()
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submit);
    await waitFor(() =>
      expect(
        body().getByText(/Tệp đính kèm vượt quá dung lượng/),
      ).toBeInTheDocument(),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const SaveDraftShowsToast: Story = {
  args: { assignment: PENDING, mode: "edit" },
  play: async () => {
    const textarea = body().getByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Bản nháp của em.");
    await userEvent.click(body().getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() =>
      expect(body().getByText("Đã lưu nháp.")).toBeInTheDocument(),
    );
  },
};

export const Submitting: Story = {
  args: { assignment: PENDING, mode: "edit", submitting: true },
  play: async () => {
    await expect(
      body().getByRole("button", { name: /Đang nộp bài/ }),
    ).toHaveAttribute("aria-busy", "true");
  },
};

export const SubmitFailure: Story = {
  args: { assignment: PENDING, mode: "edit", submitErrorKey: "network-error" },
  play: async () => {
    await expect(
      body().getByText("Lỗi kết nối. Vui lòng thử lại."),
    ).toBeInTheDocument();
  },
};

export const OverdueConfirmAccept: Story = {
  args: { assignment: OVERDUE, mode: "edit", onSubmit: fn() },
  play: async ({ args }) => {
    const textarea = body().getByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Nộp muộn.");
    const submit = body()
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submit);
    // Confirm dialog appears (recomputed overdue at click-time).
    const confirm = await body().findByRole("button", {
      name: "Tiếp tục nộp bài",
    });
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ overdueConfirmed: true }),
      ),
    );
  },
};

export const OverdueConfirmCancel: Story = {
  args: { assignment: OVERDUE, mode: "edit", onSubmit: fn() },
  play: async ({ args }) => {
    const textarea = body().getByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Nộp muộn.");
    const submit = body()
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submit);
    const cancel = await body().findByRole("button", { name: "Huỷ" });
    await userEvent.click(cancel);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const ReadonlySubmitted: Story = {
  args: { assignment: SUBMITTED, mode: "readonly" },
  play: async () => {
    await expect(
      body().getByText("Đây là bài làm đã nộp."),
    ).toBeInTheDocument();
    // No submit footer in readonly mode.
    await expect(
      body().queryByRole("button", { name: "Lưu nháp" }),
    ).not.toBeInTheDocument();
  },
};
