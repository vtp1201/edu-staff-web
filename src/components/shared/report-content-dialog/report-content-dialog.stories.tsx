import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ReportContentDialog } from "./report-content-dialog";

const rd = messages.moderation.reportDialog;

const meta = {
  title: "Shared/ReportContentDialog",
  component: ReportContentDialog,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    open: true,
    kind: "post",
    authorName: "Nguyễn Văn A",
    contentPreview:
      "Đây là nội dung bị báo cáo. Nó khá dài để minh hoạ việc cắt xuống ba dòng khi hiển thị trong hộp thoại báo cáo nội dung.",
    isSubmitting: false,
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ReportContentDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** open=false → nothing rendered in the DOM. */
export const Closed: Story = {
  args: { open: false },
  play: async () => {
    const body = within(document.body);
    await expect(body.queryByRole("dialog")).toBeNull();
  },
};

/** Opens with reason radiogroup, quoted preview, and a DISABLED submit. */
export const OpenDefault: Story = {
  play: async () => {
    const body = within(document.body);
    await expect(await body.findByRole("dialog")).toBeInTheDocument();
    await expect(body.getByRole("radiogroup")).toBeInTheDocument();
    await expect(body.getByText(rd.title)).toBeInTheDocument();
    const submit = body.getByRole("button", { name: rd.submit });
    await expect(submit).toBeDisabled();
  },
};

/** Selecting a non-"other" reason enables Submit; submitting fires onSubmit. */
export const SelectReasonAndSubmit: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const spam = body.getByRole("radio", { name: rd.reasons.spam });
    await userEvent.click(spam);
    const submit = body.getByRole("button", { name: rd.submit });
    await expect(submit).toBeEnabled();
    await userEvent.click(submit);
    await expect(args.onSubmit).toHaveBeenCalledWith({ reason: "spam" });
  },
};

/** "Khác" reveals a required note; Submit stays disabled until it's non-empty. */
export const OtherRequiresNote: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const other = body.getByRole("radio", { name: rd.reasons.other });
    await userEvent.click(other);
    const submit = body.getByRole("button", { name: rd.submit });
    await expect(submit).toBeDisabled();

    const note = body.getByPlaceholderText(rd.notePlaceholder);
    await userEvent.type(note, "  ");
    await expect(submit).toBeDisabled(); // whitespace only
    await userEvent.type(note, "quấy rối");
    await expect(submit).toBeEnabled();
    await userEvent.click(submit);
    await expect(args.onSubmit).toHaveBeenCalledWith({
      reason: "other",
      note: "quấy rối",
    });
  },
};

/** Cancel fires onCancel and never onSubmit. */
export const CancelDoesNotSubmit: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("dialog");
    await userEvent.click(body.getByRole("button", { name: rd.cancel }));
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** Escape closes via onCancel (Radix focus-trap / dismiss behavior). */
export const EscapeCloses: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
  },
};

/** Submitting state: submit is aria-busy + disabled (no double-submit). */
export const Submitting: Story = {
  args: { isSubmitting: true },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const submit = body.getByRole("button", { name: rd.submit });
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
  },
};

/** 422 → inline field error, no retry control, dialog stays open. */
export const ValidationError: Story = {
  args: { fieldError: { message: rd.errors.validation } },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    await expect(body.getByText(rd.errors.validation)).toBeInTheDocument();
    await expect(body.queryByRole("button", { name: rd.retry })).toBeNull();
  },
};

/** Transient → inline error WITH a retry button. */
export const TransientError: Story = {
  args: {
    transientError: { message: rd.errors.transient, onRetry: fn() },
  },
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("dialog");
    await expect(body.getByText(rd.errors.transient)).toBeInTheDocument();
    const retry = body.getByRole("button", { name: rd.retry });
    await userEvent.click(retry);
    await expect(args.transientError?.onRetry).toHaveBeenCalledTimes(1);
  },
};

/** 409 → informational message (not error toned), no retry. */
export const AlreadyReportedInfo: Story = {
  args: { infoMessage: rd.errors.alreadyReported },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    await expect(body.getByText(rd.errors.alreadyReported)).toBeInTheDocument();
    await expect(body.queryByRole("button", { name: rd.retry })).toBeNull();
  },
};
