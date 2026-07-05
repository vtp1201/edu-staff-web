import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { DestructiveConfirmDialog } from "./destructive-confirm-dialog";

const CANCEL_LABEL = messages.Common.confirmDialog.cancel;

const meta = {
  title: "Shared/DestructiveConfirmDialog",
  component: DestructiveConfirmDialog,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof DestructiveConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** open=false → the dialog is not present in the DOM at all. */
export const Closed: Story = {
  args: {
    open: false,
    title: "Xóa vi phạm?",
    body: "Hành động này không thể hoàn tác.",
    confirmLabel: "Xóa vi phạm",
  },
  play: async () => {
    const body = within(document.body);
    await expect(body.queryByRole("alertdialog")).toBeNull();
  },
};

/** open + idle → role=alertdialog, both buttons interactive, confirm fires onConfirm once. */
export const OpenIdle: Story = {
  args: {
    open: true,
    isLoading: false,
    title: "Xóa vi phạm?",
    body: "Vi phạm sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.",
    confirmLabel: "Xóa vi phạm",
  },
  play: async ({ args }) => {
    const body = within(document.body);
    const dialog = await body.findByRole("alertdialog");
    await expect(dialog).toBeInTheDocument();
    await expect(body.getByText("Xóa vi phạm?")).toBeInTheDocument();

    const cancel = body.getByRole("button", { name: CANCEL_LABEL });
    const confirm = body.getByRole("button", { name: "Xóa vi phạm" });
    await expect(cancel).toBeEnabled();
    await expect(confirm).toBeEnabled();
    // Initial focus moves onto the (non-destructive) cancel button on open.
    await expect(cancel).toHaveFocus();

    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

/** open + idle → clicking cancel fires onCancel exactly once. */
export const CancelClick: Story = {
  args: {
    open: true,
    isLoading: false,
    title: "Xóa vi phạm?",
    body: "Hành động này không thể hoàn tác.",
    confirmLabel: "Xóa vi phạm",
  },
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await userEvent.click(body.getByRole("button", { name: CANCEL_LABEL }));
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** Escape routes through onCancel (Radix AlertDialog default). */
export const EscapeCancels: Story = {
  args: {
    open: true,
    isLoading: false,
    title: "Xóa vi phạm?",
    body: "Hành động này không thể hoàn tác.",
    confirmLabel: "Xóa vi phạm",
  },
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** open + loading → confirm aria-busy, both buttons disabled. */
export const OpenLoading: Story = {
  args: {
    open: true,
    isLoading: true,
    title: "Xóa vi phạm?",
    body: "Hành động này không thể hoàn tác.",
    confirmLabel: "Xóa vi phạm",
  },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    const confirm = body.getByRole("button", { name: "Xóa vi phạm" });
    const cancel = body.getByRole("button", { name: CANCEL_LABEL });
    await expect(confirm).toHaveAttribute("aria-busy", "true");
    await expect(confirm).toBeDisabled();
    await expect(cancel).toBeDisabled();
  },
};

/** Instance: announcements send-to-school (recipientCount interpolated). */
export const AnnouncementsSendToSchool: Story = {
  args: {
    open: true,
    isLoading: false,
    title: messages.announcements.sendConfirmTitle,
    body: messages.announcements.sendConfirmBody.replace(
      "{recipientCount}",
      "150",
    ),
    confirmLabel: messages.announcements.btnSendNow,
  },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await expect(
      body.getByText(messages.announcements.sendConfirmTitle),
    ).toBeInTheDocument();
    await expect(body.getByText(/150/)).toBeInTheDocument();
    await expect(
      body.getByRole("button", { name: messages.announcements.btnSendNow }),
    ).toBeInTheDocument();
  },
};

/** Instance: discipline violation delete. */
export const DisciplineViolationDelete: Story = {
  args: {
    open: true,
    isLoading: false,
    title: messages.discipline.violations.deleteDialog.title,
    body: messages.discipline.violations.deleteDialog.body
      .replace("{studentName}", "Nguyễn Văn A")
      .replace("{type}", "Đi trễ"),
    confirmLabel: messages.discipline.violations.deleteDialog.confirm,
  },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await expect(
      body.getByText(messages.discipline.violations.deleteDialog.title),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("button", {
        name: messages.discipline.violations.deleteDialog.confirm,
      }),
    ).toBeInTheDocument();
  },
};

/** Instance: staff-leave reject (documented deviation still models the text variant). */
export const StaffLeaveReject: Story = {
  args: {
    open: true,
    isLoading: false,
    title: messages.staffLeave.rejectConfirmTitle,
    body: messages.staffLeave.rejectConfirmBody.replace(
      "{staffName}",
      "Trần Thị B",
    ),
    confirmLabel: messages.staffLeave.actions.confirmReject,
  },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await expect(
      body.getByText(messages.staffLeave.rejectConfirmTitle),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("button", {
        name: messages.staffLeave.actions.confirmReject,
      }),
    ).toBeInTheDocument();
  },
};
