import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
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

/** AC-1175.4 — file-too-large blocks ONLY "Nộp bài"; "Lưu nháp" must still
 *  succeed with the same oversized file attached (draft-save is local-only/
 *  lenient by design, per the Edge Case Matrix decision). */
export const OversizedFileStillAllowsDraftSave: Story = {
  args: { assignment: PENDING, mode: "edit" },
  play: async () => {
    const input = body().getByLabelText("Đính kèm tệp") as HTMLInputElement;
    const big = new File(["x"], "qua-lon.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    await userEvent.upload(input, big);
    // Attach the oversized file, THEN save draft — must succeed regardless.
    await userEvent.click(body().getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() =>
      expect(body().getByText("Đã lưu nháp.")).toBeInTheDocument(),
    );
    // No file-too-large alert should have appeared from a mere draft-save.
    await expect(
      body().queryByText(/Tệp đính kèm vượt quá dung lượng/),
    ).not.toBeInTheDocument();
  },
};

/** AC-1175.7 — a draft saved once pre-populates the sheet the next time it's
 *  opened (client-local persistence via `useAssignmentDraft`/localStorage).
 *  Uses a small controlled wrapper (real open/close toggle, not just the
 *  fixed `open` arg) so the "reopen" transition genuinely re-runs the
 *  prefill effect. */
function DraftReopenHarness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button
        type="button"
        data-testid="close-sheet-harness"
        onClick={() => setOpen(false)}
      >
        close-sheet-harness
      </button>
      <button
        type="button"
        data-testid="reopen-sheet-harness"
        onClick={() => setOpen(true)}
      >
        reopen-sheet-harness
      </button>
      <SubmitSheet
        assignment={PENDING}
        mode="edit"
        open={open}
        onOpenChange={setOpen}
        submitting={false}
        submitErrorKey={null}
        onSubmit={fn()}
      />
    </>
  );
}

export const DraftPrePopulatesOnReopen: Story = {
  render: () => <DraftReopenHarness />,
  play: async () => {
    // Isolation: other stories in this file share the same PENDING.id ("s1")
    // and write to the same real (not mocked) localStorage draft key — clear
    // it first so this story's assertions are deterministic regardless of
    // run order.
    window.localStorage.removeItem(`lms.assignment-draft.${PENDING.id}`);
    // Sanity check: the harness's own controls must exist BEFORE any sheet
    // interaction (proves the render itself is fine, independent of Radix's
    // later aria-hide-on-modal-open behavior).
    await expect(body().getByTestId("close-sheet-harness")).toBeInTheDocument();
    const textarea = body().getByLabelText("Nội dung bài làm");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Bản nháp đã lưu.");
    await userEvent.click(body().getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() =>
      expect(body().getByText("Đã lưu nháp.")).toBeInTheDocument(),
    );
    // The harness's own control buttons sit outside the Sheet's Radix portal.
    // While the modal is open, Radix marks the whole background natively
    // `inert` (correct modal-focus-containment for real app UI) — the
    // `hidden: true` role-query override only defeats `aria-hidden`, not a
    // native `inert` ancestor, so query this test-only harness chrome by
    // test id and dispatch a native click (bypassing the pointer-events/
    // inert guard, since we're driving test scaffolding, not app UI).
    body()
      .getByTestId("close-sheet-harness")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await waitFor(() =>
      expect(body().queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await userEvent.click(body().getByTestId("reopen-sheet-harness"));
    // Re-mounted edit view must pre-populate the textarea from the draft.
    await waitFor(() =>
      expect(body().getByLabelText("Nội dung bài làm")).toHaveValue(
        "Bản nháp đã lưu.",
      ),
    );
  },
};

/** AC-1176.6 — overdue-ness is recomputed at the MOMENT "Nộp bài" is clicked,
 *  not at sheet-open time. Opens on an assignment that is NOT yet overdue,
 *  waits (real time) past its deadline, then clicks — the confirm dialog
 *  must appear even though it did not exist when the sheet first opened. */
export const BecomesOverdueWhileSheetOpen: Story = {
  args: {
    assignment: {
      ...PENDING,
      dueDate: new Date(Date.now() + 40).toISOString(),
    },
    mode: "edit",
    onSubmit: fn(),
  },
  play: async ({ args }) => {
    const textarea = body().getByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Nộp trước hạn.");
    // The dialog must NOT be present yet — the deadline hasn't passed.
    await expect(body().queryByRole("alertdialog")).not.toBeInTheDocument();
    // Wait past the (very near) deadline — real elapsed time, not fake timers.
    await new Promise((r) => setTimeout(r, 80));
    const submit = body()
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submit);
    await expect(await body().findByRole("alertdialog")).toBeInTheDocument();
    const confirm = body().getByRole("button", { name: "Tiếp tục nộp bài" });
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ overdueConfirmed: true }),
      ),
    );
  },
};

/** AC-1176.3 — Cancel restores focus to "Nộp bài" with NO state change
 *  (file/text preserved, no submission attempted). Verified beyond
 *  "onSubmit not called" (already covered by `OverdueConfirmCancel` above) by
 *  also asserting the answer text survives and focus is actually restored. */
export const OverdueCancelRestoresFocusAndState: Story = {
  args: { assignment: OVERDUE, mode: "edit", onSubmit: fn() },
  play: async ({ args }) => {
    const textarea = body().getByLabelText(
      "Nội dung bài làm",
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Nộp muộn, giữ nguyên nội dung.");
    const submit = body()
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submit);
    const cancel = await body().findByRole("button", { name: "Huỷ" });
    await userEvent.click(cancel);
    await expect(args.onSubmit).not.toHaveBeenCalled();
    // Dialog fully closes (its exit animation completes) before focus-restore.
    await waitFor(() =>
      expect(body().queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    // AC-1176.3: focus must be restored to the "Nộp bài" trigger once the
    // confirm dialog closes. (QA finding: actual observed behavior sends
    // focus to <body> instead — see DEF list in the QA report; this
    // assertion intentionally documents the REQUIRED behavior, not a
    // workaround for the current gap.)
    await waitFor(() => expect(submit).toHaveFocus(), { timeout: 1000 });
    // Text state preserved unchanged.
    await expect(textarea).toHaveValue("Nộp muộn, giữ nguyên nội dung.");
  },
};

/** AC-1176.3 (Escape variant) — pressing Escape on the confirm dialog behaves
 *  identically to clicking "Huỷ": no submission, sheet unchanged. */
export const OverdueConfirmEscapeCancels: Story = {
  args: { assignment: OVERDUE, mode: "edit", onSubmit: fn() },
  play: async ({ args }) => {
    const textarea = body().getByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Nộp muộn.");
    const submit = body()
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submit);
    await body().findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(body().queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** NFR-001/AC-1174.5 (Escape variant, sheet-local proof) — pressing Escape
 *  closes the sheet. The trigger-focus-restore half of this AC is proven at
 *  the container level (`student-assignments-screen.stories.tsx` — a real
 *  card CTA button exists there to restore focus to; this isolated
 *  `SubmitSheet` story has no such external trigger of its own). */
export const EscapeClosesTheSheet: Story = {
  args: { assignment: PENDING, mode: "edit", onOpenChange: fn() },
  play: async ({ args }) => {
    await body().findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

/** NFR-001/AC-1174.5 — Escape-to-close restores focus to the element that had
 *  focus before the sheet opened (Radix Sheet default). Uses a real trigger
 *  button in a controlled harness (a fixed `open: true` arg has no "before"
 *  state to restore to). */
function EscapeFocusRestoreHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open-sheet-trigger
      </button>
      <SubmitSheet
        assignment={PENDING}
        mode="edit"
        open={open}
        onOpenChange={setOpen}
        submitting={false}
        submitErrorKey={null}
        onSubmit={fn()}
      />
    </>
  );
}

export const EscapeClosesAndRestoresFocusToTrigger: Story = {
  render: () => <EscapeFocusRestoreHarness />,
  play: async () => {
    const trigger = body().getByRole("button", { name: "open-sheet-trigger" });
    await userEvent.click(trigger);
    await body().findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(body().queryByRole("dialog")).not.toBeInTheDocument(),
    );
    // AC-1174.5: focus must return to the triggering CTA. (QA finding: actual
    // observed behavior sends focus to <body> instead, confirmed not a
    // timing/animation artifact — see DEF list in the QA report.)
    await waitFor(() => expect(trigger).toHaveFocus(), { timeout: 1500 });
  },
};

/** NFR-003 — sheet is full-bleed (`maxWidth: 100vw`) below the 520px
 *  breakpoint. Genuinely resizes the browser viewport (not just a viewport
 *  parameter declaration, which this repo has no addon for). */
export const FullBleedBelow520px: Story = {
  args: { assignment: PENDING, mode: "edit" },
  play: async () => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 812);
    const dialog = body().getByRole("dialog");
    await waitFor(() => {
      const width = dialog.getBoundingClientRect().width;
      expect(width).toBeGreaterThanOrEqual(370);
    });
  },
};
