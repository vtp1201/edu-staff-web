import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ReasonConfirmDialog } from "./reason-confirm-dialog";

const m = messages.gradeEntry;
const CANCEL_LABEL = messages.Common.confirmDialog.cancel;
const MAX = 500;

const baseArgs = {
  open: true,
  title: m.rejectDialogTitle,
  description: m.rejectDialogDescription,
  reasonLabel: m.rejectReasonLabel,
  reasonPlaceholder: m.rejectReasonPlaceholder,
  confirmLabel: m.rejectConfirm,
  maxLength: MAX,
  requiredMessage: m.errorRejectionReasonRequired,
  tooLongMessage: m.errorRejectionReasonTooLong.replace("{max}", String(MAX)),
  formatCounter: (count: number) =>
    m.rejectReasonCounter
      .replace("{count}", String(count))
      .replace("{max}", String(MAX)),
};

const meta = {
  title: "Shared/ReasonConfirmDialog",
  component: ReasonConfirmDialog,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: { onConfirm: fn(), onOpenChange: fn() },
} satisfies Meta<typeof ReasonConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed → nothing in the DOM (no hidden-but-focusable content). */
export const Closed: Story = {
  args: { ...baseArgs, open: false },
  play: async () => {
    const body = within(document.body);
    await expect(body.queryByRole("dialog")).toBeNull();
  },
};

/** Open + empty reason → confirm is DISABLED (a blank reason cannot be submitted). */
export const OpenEmpty: Story = {
  args: baseArgs,
  play: async ({ args }) => {
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    await expect(body.getByText(m.rejectDialogTitle)).toBeInTheDocument();

    const field = body.getByLabelText(m.rejectReasonLabel);
    await expect(field).toHaveAttribute("aria-required", "true");

    const confirm = body.getByRole("button", { name: m.rejectConfirm });
    // Disabled → not clickable at all (`pointer-events: none`), so a blank
    // reason can never reach onConfirm, by keyboard or pointer.
    await expect(confirm).toBeDisabled();
    await userEvent.keyboard("{Enter}");
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** Typing a valid reason enables confirm and passes the TRIMMED text up. */
export const ValidReason: Story = {
  args: baseArgs,
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const field = body.getByLabelText(m.rejectReasonLabel);

    await userEvent.type(field, "  Sai điểm cuối kỳ  ");
    const confirm = body.getByRole("button", { name: m.rejectConfirm });
    await expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).toHaveBeenCalledWith("Sai điểm cuối kỳ");
  },
};

/** Clearing a typed reason surfaces the required error (text + aria-invalid). */
export const RequiredErrorAfterClearing: Story = {
  args: baseArgs,
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const field = body.getByLabelText(m.rejectReasonLabel);

    await userEvent.type(field, "x");
    await userEvent.clear(field);

    const alert = await body.findByRole("alert");
    await expect(alert).toHaveTextContent(m.errorRejectionReasonRequired);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(
      body.getByRole("button", { name: m.rejectConfirm }),
    ).toBeDisabled();
  },
};

/** Over-long reason → distinct message, confirm blocked, counter turns error-toned. */
export const TooLongReason: Story = {
  args: baseArgs,
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const field = body.getByLabelText(m.rejectReasonLabel);

    // paste, not per-key typing (501 keystrokes is needlessly slow)
    await userEvent.click(field);
    await userEvent.paste("x".repeat(MAX + 1));

    const alert = await body.findByRole("alert");
    await expect(alert).toHaveTextContent(baseArgs.tooLongMessage);
    await expect(
      body.getByRole("button", { name: m.rejectConfirm }),
    ).toBeDisabled();
    await expect(body.getByText(`${MAX + 1}/${MAX} ký tự`)).toBeInTheDocument();
  },
};

/** Pending → both actions disabled, confirm aria-busy. */
export const Pending: Story = {
  args: { ...baseArgs, isPending: true },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const confirm = body.getByRole("button", { name: m.rejectConfirm });
    await expect(confirm).toHaveAttribute("aria-busy", "true");
    await expect(confirm).toBeDisabled();
    await expect(
      body.getByRole("button", { name: CANCEL_LABEL }),
    ).toBeDisabled();
  },
};

/** Server failure → inline alert; the field stays editable so the user can retry. */
export const ServerError: Story = {
  args: {
    ...baseArgs,
    errorMessage: messages.gradeEntry.errorNotDraft,
  },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const alert = await body.findByRole("alert");
    await expect(alert).toHaveTextContent(messages.gradeEntry.errorNotDraft);
    await expect(body.getByLabelText(m.rejectReasonLabel)).toBeEnabled();
  },
};

/** Cancel routes through onOpenChange(false) — never through onConfirm. */
export const CancelClosesWithoutConfirming: Story = {
  args: baseArgs,
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("dialog");
    await userEvent.click(body.getByRole("button", { name: CANCEL_LABEL }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};
