import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Button } from "@/components/ui/button";
import { LeaveRequestDialog } from "./leave-request-dialog";
import { MAX_ATTACHMENT_BYTES } from "./validate-leave-attachments";

const m = messages.discipline.studentConduct.leaveRequest;
const mAttach = m.attachments;
const TODAY = "2026-09-06";

const baseArgs = {
  open: true,
  minDate: TODAY,
  description: "Nguyễn Minh Khoa · Lớp 11A2",
};

function file(name: string, bytes = 128, type = "image/png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const meta = {
  title: "Shared/LeaveRequestDialog",
  component: LeaveRequestDialog,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: { onSubmit: fn(), onOpenChange: fn() },
} satisfies Meta<typeof LeaveRequestDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed → nothing in the DOM (no hidden-but-focusable form). */
export const Closed: Story = {
  args: { ...baseArgs, open: false },
  play: async () => {
    await expect(within(document.body).queryByRole("dialog")).toBeNull();
  },
};

/**
 * AC: submit is disabled while the reason is empty, and the reason field is
 * `aria-describedby` the sentence that explains WHY.
 */
export const EmptyReasonBlocksSubmit: Story = {
  args: baseArgs,
  play: async ({ args }) => {
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();

    const reason = body.getByLabelText(m.reason);
    await expect(reason).toHaveAttribute("aria-required", "true");

    const describedBy = reason.getAttribute("aria-describedby") ?? "";
    const explained = describedBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    await expect(explained).toContain(m.reasonRequired);

    const submit = body.getByRole("button", { name: new RegExp(m.submit) });
    await expect(submit).toBeDisabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    // Typing a reason enables it and hands the TRIMMED text up.
    await userEvent.type(reason, "  Khám sức khoẻ định kỳ  ");
    await expect(submit).toBeEnabled();
    await userEvent.click(submit);
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(args.onSubmit).toHaveBeenCalledWith({
      startDate: TODAY,
      endDate: TODAY,
      reason: "Khám sức khoẻ định kỳ",
      files: [],
    });
  },
};

/** Moving the start date past the end date drags the end with it (no inverted range). */
export const StartDateClampsEndDate: Story = {
  args: baseArgs,
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");

    const start = body.getByLabelText(m.startDate) as HTMLInputElement;
    const end = body.getByLabelText(m.endDate) as HTMLInputElement;
    await expect(start).toHaveAttribute("min", TODAY);

    await userEvent.clear(start);
    await userEvent.type(start, "2026-09-20");

    await waitFor(async () => {
      await expect(end.value).toBe("2026-09-20");
      await expect(end).toHaveAttribute("min", "2026-09-20");
    });
  },
};

/**
 * AC: the 4th file / an oversized file / a wrong extension are refused CLIENT
 * side with a visible TEXT reason (not colour alone).
 */
export const RejectedAttachments: Story = {
  args: baseArgs,
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    const picker = body.getByLabelText(mAttach.label) as HTMLInputElement;

    await userEvent.upload(picker, [
      file("a.png"),
      file("b.jpg"),
      file("c.pdf", 128, "application/pdf"),
      file("d.png"),
      file("huge.png", MAX_ATTACHMENT_BYTES + 1),
    ]);

    const alert = await body.findByRole("alert");
    await expect(alert).toHaveTextContent(mAttach.rejectedTitle);
    // Each rejection names the file AND the rule it broke.
    await expect(alert).toHaveTextContent(
      mAttach.errorCount.replace("{fileName}", "d.png"),
    );
    await expect(alert).toHaveTextContent(
      mAttach.errorSize.replace("{fileName}", "huge.png"),
    );
    // The wrong-EXTENSION path is proved in `validate-leave-attachments.test.ts`
    // instead: the `accept=".jpg,.jpeg,.png,.pdf"` attribute makes the browser
    // drop such a file before `change` fires, so `userEvent.upload` can never
    // deliver one here. The validator remains the second net for the paths
    // `accept` does not cover (drag-and-drop, a renamed file).

    // The 3 valid files are kept, each removable by an aria-labelled button.
    await expect(
      body.getByRole("button", {
        name: mAttach.remove.replace("{fileName}", "a.png"),
      }),
    ).toBeInTheDocument();
    // Cap reached → the picker itself is disabled.
    await expect(picker).toBeDisabled();
  },
};

/** Valid files ride along with the submission. */
export const SubmitsWithAttachments: Story = {
  args: baseArgs,
  play: async ({ args }) => {
    const body = within(document.body);
    await body.findByRole("dialog");

    await userEvent.type(body.getByLabelText(m.reason), "Ốm");
    await userEvent.upload(body.getByLabelText(mAttach.label), [
      file("don.pdf", 64, "application/pdf"),
    ]);
    await userEvent.click(
      body.getByRole("button", { name: new RegExp(m.submit) }),
    );

    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    const submission = args.onSubmit.mock.calls[0][0];
    await expect(submission.files).toHaveLength(1);
    await expect(submission.files[0].name).toBe("don.pdf");
  },
};

/** Pending → both actions disabled, submit `aria-busy` with the "Đang gửi..." copy. */
export const Pending: Story = {
  args: { ...baseArgs, isPending: true },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");

    const submit = body.getByRole("button", { name: new RegExp(m.submitting) });
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(body.getByRole("button", { name: m.cancel })).toBeDisabled();
  },
};

/** A server failure is shown as inline text, not swallowed. */
export const ServerError: Story = {
  args: {
    ...baseArgs,
    errorMessage: messages.discipline.errors.forbidden,
  },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("dialog");
    await expect(
      body.getByText(messages.discipline.errors.forbidden),
    ).toBeInTheDocument();
  },
};

/**
 * AC: Escape closes and focus returns to the button that opened the dialog.
 * Radix owns the trap/Escape/return — this story PROVES it in our wiring rather
 * than re-implementing it.
 */
export const EscapeReturnsFocusToTrigger: Story = {
  args: baseArgs,
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button type="button" onClick={() => setOpen(true)}>
          {messages.parentAttendance.requestLeaveButton}
        </Button>
        <LeaveRequestDialog
          {...args}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            args.onOpenChange(next);
          }}
        />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const trigger = canvas.getByRole("button", {
      name: messages.parentAttendance.requestLeaveButton,
    });
    await userEvent.click(trigger);

    const dialog = await body.findByRole("dialog");
    // Focus moved INTO the dialog (Radix's trap).
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );

    await userEvent.keyboard("{Escape}");

    await waitFor(async () => {
      await expect(body.queryByRole("dialog")).toBeNull();
      await expect(document.activeElement).toBe(trigger);
    });
  },
};

/** 375px — the dialog fits and the date pair stacks to one column. */
export const Mobile: Story = {
  args: baseArgs,
  globals: { viewport: { value: "mobile1" } },
  play: async () => {
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");

    // The panel fits the 375px viewport — nothing overflows horizontally.
    const rect = dialog.getBoundingClientRect();
    await expect(rect.width).toBeLessThanOrEqual(window.innerWidth);
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(
      dialog.clientWidth + 1,
    );

    // Both date fields exist (they may be below the fold — the panel scrolls).
    await expect(body.getByLabelText(m.startDate)).toBeInTheDocument();
    await expect(body.getByLabelText(m.endDate)).toBeInTheDocument();
  },
};
