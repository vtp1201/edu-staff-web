import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { PublishConfirmDialog } from "./publish-confirm-dialog";

const LABELS = {
  title: "Phát hành câu hỏi?",
  body: "Câu hỏi sẽ chuyển sang trạng thái Đã phát hành và không thể chỉnh sửa thêm (một chiều).",
  confirm: "Phát hành",
  publishing: "Đang phát hành…",
  cancel: "Huỷ",
};

const meta = {
  title: "Shared/PublishConfirmDialog",
  component: PublishConfirmDialog,
  parameters: { layout: "centered" },
  args: {
    labels: LABELS,
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof PublishConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** open=false → the dialog is not present in the DOM at all. */
export const Closed: Story = {
  args: { open: false, isLoading: false },
  play: async () => {
    const body = within(document.body);
    await expect(body.queryByRole("alertdialog")).toBeNull();
  },
};

/** open + idle → role=alertdialog, both buttons interactive, confirm fires onConfirm once. */
export const OpenIdle: Story = {
  args: { open: true, isLoading: false },
  play: async ({ args }) => {
    const body = within(document.body);
    const dialog = await body.findByRole("alertdialog");
    await expect(dialog).toBeInTheDocument();
    await expect(body.getByText(LABELS.title)).toBeInTheDocument();

    const cancel = body.getByRole("button", { name: LABELS.cancel });
    const confirm = body.getByRole("button", { name: LABELS.confirm });
    await expect(cancel).toBeEnabled();
    await expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

/** open + idle → clicking cancel fires onCancel exactly once. */
export const CancelClick: Story = {
  args: { open: true, isLoading: false },
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await userEvent.click(body.getByRole("button", { name: LABELS.cancel }));
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** Escape routes through onCancel while idle (Radix AlertDialog default). */
export const EscapeCancels: Story = {
  args: { open: true, isLoading: false },
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
  },
};

/**
 * open + loading → confirm aria-busy + spinner + "publishing" label, both
 * buttons disabled, and the dialog does NOT auto-close (parent controls
 * `open`, mirroring the "stays open with a spinner on error" contract).
 */
export const OpenLoading: Story = {
  args: { open: true, isLoading: true },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    const confirm = body.getByRole("button", { name: LABELS.publishing });
    const cancel = body.getByRole("button", { name: LABELS.cancel });
    await expect(confirm).toHaveAttribute("aria-busy", "true");
    await expect(confirm).toBeDisabled();
    await expect(cancel).toBeDisabled();
  },
};

/** Escape/overlay while loading must NOT cancel (in-flight request protection). */
export const LoadingIgnoresEscape: Story = {
  args: { open: true, isLoading: true },
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

/**
 * `errorSlot` tone `blocked` (US-E09.6) — the message renders in a live
 * `role="alert"` region, confirm is FORCE-disabled (re-clicking can only fail
 * again) and Cancel stays the only way out.
 */
export const WithBlockedError: Story = {
  args: {
    open: true,
    isLoading: false,
    errorSlot: {
      tone: "blocked",
      message: "Bạn không có quyền thực hiện thao tác này.",
    },
  },
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await expect(body.getByRole("alert")).toHaveTextContent(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    await expect(
      body.getByRole("button", { name: LABELS.confirm }),
    ).toBeDisabled();
    await expect(
      body.getByRole("button", { name: LABELS.cancel }),
    ).toBeEnabled();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/**
 * `errorSlot` tone `transient` — same click retries, so confirm stays ENABLED
 * (the tone difference is carried by icon + colour, never colour alone).
 */
export const WithTransientError: Story = {
  args: {
    open: true,
    isLoading: false,
    errorSlot: {
      tone: "transient",
      message: "Không thể kết nối. Vui lòng thử lại.",
    },
  },
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await expect(body.getByRole("alert")).toHaveTextContent(
      "Không thể kết nối. Vui lòng thử lại.",
    );
    const confirm = body.getByRole("button", { name: LABELS.confirm });
    await expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

/**
 * A11Y-001 (US-E09.6) — WCAG 2.4.3. This dialog is ALWAYS controlled via `open`
 * with no `<AlertDialogTrigger>`, so Radix's `triggerRef` is null and its default
 * `onCloseAutoFocus` drops focus to `<body>`. `useDialogReturnFocus` must restore
 * focus to the control that opened it, on Cancel AND on Escape.
 */
export const ReturnsFocusToInvoker: Story = {
  args: { open: false, isLoading: false },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Mở hộp thoại
        </button>
        <PublishConfirmDialog
          {...args}
          open={open}
          onCancel={() => setOpen(false)}
        />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const invoker = canvas.getByRole("button", { name: "Mở hộp thoại" });

    await userEvent.click(invoker);
    await body.findByRole("alertdialog");
    await userEvent.click(body.getByRole("button", { name: LABELS.cancel }));
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(invoker).toHaveFocus());

    // …and the same on Escape.
    await userEvent.click(invoker);
    await body.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(invoker).toHaveFocus());
  },
};
