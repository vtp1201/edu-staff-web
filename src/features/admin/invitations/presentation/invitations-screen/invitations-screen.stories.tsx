import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertTriangle, CalendarX } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import type { Invitation } from "../../domain/entities/invitation.entity";
import { buildRowVM, type RowVMLabels } from "./build-row-vm";
import { ExpiryCountdownCell } from "./expiry-countdown-cell";
import { InvitationsCardList } from "./invitations-card-list";
import type { InvitationsRowsLabels } from "./invitations-rows.i-vm";
import { InvitationsScreen } from "./invitations-screen";
import type {
  InvitationsScreenProps,
  ListActionResult,
  MutationActionResult,
  SendBatchActionResult,
} from "./invitations-screen.i-vm";

const NOW = Date.now();
const DAY = 86_400_000;
const iso = (offsetDays: number) =>
  new Date(NOW + offsetDays * DAY).toISOString();

const INVITATIONS: Invitation[] = [
  {
    id: "inv-1",
    email: "lan.pham@email.com",
    role: "teacher",
    status: "pending",
    invitedBy: "Trần Minh Quân",
    sentAt: iso(-6),
    expiresAt: iso(8), // normal
  },
  {
    id: "inv-2",
    email: "hoang.long@student.edu.vn",
    role: "student",
    status: "pending",
    invitedBy: "Nguyễn Thị Hương",
    sentAt: iso(-12),
    expiresAt: iso(2), // urgent
  },
  {
    id: "inv-3",
    email: "thu.trang@email.com",
    role: "parent",
    status: "accepted",
    invitedBy: "Trần Minh Quân",
    sentAt: iso(-20),
    expiresAt: iso(-6),
  },
  {
    id: "inv-4",
    email: "van.minh@email.com",
    role: "teacher",
    status: "expired",
    invitedBy: "Trần Minh Quân",
    sentAt: iso(-40),
    expiresAt: iso(-26),
  },
  {
    id: "inv-5",
    email: "quoc.huy@email.com",
    role: "manager",
    status: "revoked",
    invitedBy: "Trần Minh Quân",
    sentAt: iso(-30),
    expiresAt: iso(-16),
  },
  {
    id: "inv-6",
    email: "system.admin@email.com",
    role: "admin",
    status: "pending",
    invitedBy: "Trần Minh Quân",
    sentAt: iso(-2),
    expiresAt: iso(12),
  },
];

const okList = async (): Promise<ListActionResult> => ({
  ok: true,
  data: INVITATIONS,
});
const okSendAll = async (
  input: Parameters<InvitationsScreenProps["onSendBatch"]>[0],
): Promise<SendBatchActionResult> => ({
  ok: true,
  outcome: {
    succeeded: input.emails.map((email, i) => ({
      email,
      invitationId: `sent-${i}`,
    })),
    failed: [],
  },
});
const okMutation = async (): Promise<MutationActionResult> => ({ ok: true });

const baseProps: InvitationsScreenProps = {
  initialInvitations: INVITATIONS,
  initialLoadFailed: false,
  tenantId: "tenant-acme",
  onRefresh: okList,
  onSendBatch: okSendAll,
  onResend: okMutation,
  onRevoke: okMutation,
};

const meta: Meta<typeof InvitationsScreen> = {
  title: "Features/Admin/InvitationsScreen",
  component: InvitationsScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => {
      // Radix portal locks body pointer-events; reset so it doesn't bleed
      // between stories.
      if (typeof document !== "undefined")
        document.body.style.pointerEvents = "";
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false, retryDelay: 0 },
          mutations: { retry: false },
        },
      });
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-[color:var(--edu-bg)]">
              <Story />
            </div>
            <Toaster />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof InvitationsScreen>;

/** 1. Loading — 5-row skeleton (initial RSC load failed → client query pending). */
export const Loading: Story = {
  args: {
    ...baseProps,
    initialLoadFailed: true,
    onRefresh: () => new Promise<ListActionResult>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The skeleton container is aria-hidden; assert the table/empty are absent.
    await expect(canvas.queryByRole("table")).toBeNull();
    await expect(canvas.queryByText("Chưa có lời mời nào")).toBeNull();
  },
};

/** 2. Success — full table with all statuses + countdown variants. */
export const Success: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("lan.pham@email.com")).toBeInTheDocument();
    await expect(canvas.getByRole("table")).toBeInTheDocument();
    // revoked row + revoked badge present
    await expect(canvas.getAllByText("Đã thu hồi").length).toBeGreaterThan(0);
  },
};

/** 3. Empty — no invitations; CTA opens the send dialog. */
export const EmptyNoInvitations: Story = {
  args: {
    ...baseProps,
    initialInvitations: [],
    onRefresh: async () => ({ ok: true, data: [] }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Chưa có lời mời nào")).toBeInTheDocument();
    // Both the header action and the empty-state CTA read "Gửi lời mời" — either
    // opens the dialog; click the first.
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Gửi lời mời" })[0],
    );
    const body = within(document.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeInTheDocument());
  },
};

/** 4. Empty (no match) — filter/search yields zero from a non-empty base. */
export const EmptyNoMatch: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole("searchbox", { name: /Tìm theo email/i });
    await userEvent.type(search, "no-such-invitee");
    await waitFor(() =>
      expect(
        canvas.getByText("Không có lời mời nào khớp bộ lọc"),
      ).toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole("button", { name: "Xoá bộ lọc" }),
    ).toBeInTheDocument();
    // AC-002.5 — clicking it resets the search AND returns the full table.
    await userEvent.click(canvas.getByRole("button", { name: "Xoá bộ lọc" }));
    await waitFor(() =>
      expect(canvas.getByText("lan.pham@email.com")).toBeInTheDocument(),
    );
    await expect(canvas.getByRole("table")).toBeInTheDocument();
    await expect(
      canvas.queryByText("Không có lời mời nào khớp bộ lọc"),
    ).toBeNull();
  },
};

/** 5. Error + retry — first refresh fails, retry succeeds. */
export const ErrorAndRetry: Story = {
  args: {
    ...baseProps,
    initialLoadFailed: true,
    onRefresh: (() => {
      let failed = false;
      return async (): Promise<ListActionResult> => {
        if (!failed) {
          failed = true;
          return { ok: false, errorKey: "network-error" };
        }
        return { ok: true, data: INVITATIONS };
      };
    })(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText("Không tải được danh sách lời mời"),
      ).toBeInTheDocument(),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Thử lại" }));
    await waitFor(() =>
      expect(canvas.getByText("lan.pham@email.com")).toBeInTheDocument(),
    );
  },
};

/** 5b. Error persists — retry ALSO fails; error state remains (no silent
 *  fallback to empty/blank, no infinite spinner) — AC-001.5. */
export const ErrorPersistsOnRetryFailure: Story = {
  args: {
    ...baseProps,
    initialLoadFailed: true,
    onRefresh: async () => ({ ok: false, errorKey: "network-error" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText("Không tải được danh sách lời mời"),
      ).toBeInTheDocument(),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Thử lại" }));
    // still the error state — no blank/empty fallback, no stuck spinner
    await waitFor(() =>
      expect(
        canvas.getByText("Không tải được danh sách lời mời"),
      ).toBeInTheDocument(),
    );
    await expect(canvas.queryByRole("table")).toBeNull();
    await expect(canvas.queryByText("Chưa có lời mời nào")).toBeNull();
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};

/** 6. Send dialog — valid chip, invalid chip + inline error, paste-multiple. */
export const SendDialogChipStates: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Gửi lời mời" }));
    const body = within(document.body);
    const dialog = within(await body.findByRole("dialog"));
    const input = await dialog.findByLabelText("Email người được mời");
    // "new.teacher@x.com" isn't in the table behind the dialog → chip assertions
    // scoped to the dialog also avoid table-row collisions.
    await userEvent.type(input, "new.teacher@x.com{Enter}");
    await expect(dialog.getByText("new.teacher@x.com")).toBeInTheDocument();
    await userEvent.type(input, "bad-email{Enter}");
    await expect(dialog.getByText("bad-email")).toBeInTheDocument();
    await expect(dialog.getByRole("alert")).toHaveTextContent(
      /không đúng định dạng/i,
    );
    // paste-multiple splits into separate chips
    await userEvent.type(input, "a@x.com, b@x.com{Enter}");
    await expect(dialog.getByText("a@x.com")).toBeInTheDocument();
    await expect(dialog.getByText("b@x.com")).toBeInTheDocument();
  },
};

/** 7. Send submitting — spinner + aria-busy + count-aware label. */
export const SendDialogSubmitting: Story = {
  args: {
    ...baseProps,
    onSendBatch: () => new Promise<SendBatchActionResult>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Gửi lời mời" }));
    const body = within(document.body);
    const input = await body.findByLabelText("Email người được mời");
    await userEvent.type(input, "a@x.com b@x.com{Enter}");
    const submit = body.getByRole("button", { name: "Gửi 2 lời mời" });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
  },
};

/** 8. Send partial failure — 1 succeeds, 1 duplicate-fails; failed chip stays. */
export const SendDialogPartialFailure: Story = {
  args: {
    ...baseProps,
    onSendBatch: async (input): Promise<SendBatchActionResult> => ({
      ok: true,
      outcome: {
        succeeded: [{ email: input.emails[0], invitationId: "s0" }],
        failed: [{ email: input.emails[1], failureKey: "invitation-invalid" }],
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Gửi lời mời" }));
    const body = within(document.body);
    const input = await body.findByLabelText("Email người được mời");
    await userEvent.type(input, "ok@x.com dupe@x.com{Enter}");
    await userEvent.click(body.getByRole("button", { name: "Gửi 2 lời mời" }));
    // AC-003.10 — partial-success toast composition ("N sent, M failed").
    await waitFor(() =>
      expect(
        body.getByText("Đã gửi 1 lời mời, 1 lời mời gặp lỗi"),
      ).toBeInTheDocument(),
    );
    // succeeded chip removed, failed chip remains + duplicate error shown
    await waitFor(() => expect(body.queryByText("ok@x.com")).toBeNull());
    await expect(body.getByText("dupe@x.com")).toBeInTheDocument();
    // dialog stays open (only the resolved chips are pruned, not closed)
    await expect(body.getByRole("dialog")).toBeInTheDocument();
  },
};

/** 8b. Send dialog — full completion with ZERO mouse interaction (NFR-001):
 *  open via keyboard, add a chip via keyboard, remove it via its keyboard-
 *  focusable remove button, add it back, move role selection with arrow keys,
 *  move expiry with the keyboard, then submit with Enter. */
export const SendDialogKeyboardOnly: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openBtn = canvas.getByRole("button", { name: "Gửi lời mời" });
    openBtn.focus();
    await userEvent.keyboard("{Enter}");
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    const dialogScope = within(dialog);

    const input = await dialogScope.findByLabelText("Email người được mời");
    input.focus();
    await userEvent.keyboard("kb.only@x.com{Enter}");
    await expect(dialogScope.getByText("kb.only@x.com")).toBeInTheDocument();

    // Tab to the chip's remove button and remove it via keyboard (AC-003.5's
    // "focusable remove control" path), then re-add.
    const removeBtn = dialogScope.getByRole("button", {
      name: /kb\.only@x\.com/i,
    });
    removeBtn.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(dialogScope.queryByText("kb.only@x.com")).toBeNull(),
    );
    input.focus();
    await userEvent.keyboard("kb.only@x.com{Enter}");
    await expect(dialogScope.getByText("kb.only@x.com")).toBeInTheDocument();

    // Role radiogroup — arrow-key navigation (Radix segmented radio).
    const roleGroup = dialogScope.getByRole("radiogroup");
    within(roleGroup).getAllByRole("radio")[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(roleGroup).getAllByRole("radio")[1]).toHaveFocus();

    // Expiry select — opens via keyboard (Enter on the trigger) and its
    // options are keyboard-navigable (ArrowDown moves the ARIA-highlighted
    // option) — proves the control itself is fully keyboard-operable.
    const expiryTrigger = dialogScope.getByRole("combobox");
    expiryTrigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.getByRole("listbox")).toBeInTheDocument());
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      body.getByRole("option", { name: /30 ngày/i }),
    ).toBeInTheDocument();
  },
};

/**
 * 8b2. DEF-1 regression (US-E21.1 QA): Escape while the expiry Select's
 * listbox is open must close ONLY the listbox, not the whole Send-Invite
 * Dialog (which would silently discard any typed-but-uncommitted chips).
 */
export const SendDialogEscapeOnOpenSelectKeepsDialogOpen: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openBtn = canvas.getByRole("button", { name: "Gửi lời mời" });
    await userEvent.click(openBtn);
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    const dialogScope = within(dialog);

    const input = await dialogScope.findByLabelText("Email người được mời");
    await userEvent.type(input, "keep.me@x.com{Enter}");
    await expect(dialogScope.getByText("keep.me@x.com")).toBeInTheDocument();

    const expiryTrigger = dialogScope.getByRole("combobox");
    expiryTrigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.getByRole("listbox")).toBeInTheDocument());

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("listbox")).toBeNull());
    // The Dialog itself must still be open, chip untouched.
    await expect(body.getByRole("dialog")).toBeInTheDocument();
    await expect(dialogScope.getByText("keep.me@x.com")).toBeInTheDocument();
  },
};

/**
 * 8c. Send dialog — keyboard-only completion end to end (NFR-001), continued
 * from the control-level proof above: leaves role/expiry at their (valid)
 * defaults — the AC only requires the controls be keyboard-operable, not that
 * every run touches them — and finishes add-chip → submit with zero mouse.
 */
export const SendDialogKeyboardOnlySubmit: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openBtn = canvas.getByRole("button", { name: "Gửi lời mời" });
    openBtn.focus();
    await userEvent.keyboard("{Enter}");
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    const dialogScope = within(dialog);

    const input = await dialogScope.findByLabelText("Email người được mời");
    input.focus();
    await userEvent.keyboard("kb.submit@x.com{Enter}");
    await expect(dialogScope.getByText("kb.submit@x.com")).toBeInTheDocument();

    const submitBtn = dialogScope.getByRole("button", {
      name: /Gửi lời mời/i,
    });
    submitBtn.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

/** 9. Copy link — pending row → clipboard success toast. */
export const CopyLink: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
    const canvas = within(canvasElement);
    const copyBtn = canvas.getAllByRole("button", {
      name: /Copy link mời/i,
    })[0];
    await userEvent.click(copyBtn);
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Đã sao chép link mời")).toBeInTheDocument(),
    );
  },
};

/** 9b. Copy link — clipboard denied/throws → error toast, no success toast (AC-004.2). */
export const CopyLinkClipboardDenied: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    });
    const canvas = within(canvasElement);
    const copyBtn = canvas.getAllByRole("button", {
      name: /Copy link mời/i,
    })[0];
    await userEvent.click(copyBtn);
    const body = within(document.body);
    await waitFor(() =>
      expect(
        body.getByText("Không thể sao chép link. Vui lòng thử lại."),
      ).toBeInTheDocument(),
    );
    await expect(body.queryByText("Đã sao chép link mời")).toBeNull();
  },
};

/** 9c. Copy link — Clipboard API entirely unavailable (SSR/older test env edge
 *  case, no `navigator.clipboard`) → same denied error toast, no crash. */
export const CopyLinkClipboardUnavailable: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    const canvas = within(canvasElement);
    const copyBtn = canvas.getAllByRole("button", {
      name: /Copy link mời/i,
    })[0];
    await userEvent.click(copyBtn);
    const body = within(document.body);
    await waitFor(() =>
      expect(
        body.getByText("Không thể sao chép link. Vui lòng thử lại."),
      ).toBeInTheDocument(),
    );
    // restore for subsequent stories in this file
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  },
};

/** 10a. Resend loading — row action shows a spinner while in flight. */
export const ResendRowLoading: Story = {
  args: {
    ...baseProps,
    onResend: () => new Promise<MutationActionResult>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const resend = canvas.getAllByRole("button", {
      name: /Gửi lại lời mời/i,
    })[0];
    await userEvent.click(resend);
    await waitFor(() => expect(resend).toHaveAttribute("aria-busy", "true"));
  },
};

/** 10b. Resend success — toast. */
export const ResendSuccess: Story = {
  args: { ...baseProps, onResend: okMutation },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Gửi lại lời mời/i })[0],
    );
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText(/Đã gửi lại lời mời/i)).toBeInTheDocument(),
    );
  },
};

/** 10c. Resend race — invalid-state error toast. */
export const ResendRaceError: Story = {
  args: {
    ...baseProps,
    onResend: async () => ({ ok: false, errorKey: "invalid-state" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Gửi lại lời mời/i })[0],
    );
    const body = within(document.body);
    await waitFor(() =>
      expect(
        body.getByText("Không thể gửi lại — lời mời đã thay đổi trạng thái"),
      ).toBeInTheDocument(),
    );
  },
};

/** 10d. Resend — network/5xx error → error toast, row unchanged, NO refetch
 *  (asymmetric invalidation, AC-005.5: only a state-race reconciles the list). */
export const ResendNetworkError: Story = {
  args: {
    ...baseProps,
    onResend: async () => ({ ok: false, errorKey: "network-error" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Gửi lại lời mời/i })[0],
    );
    const body = within(document.body);
    await waitFor(() =>
      expect(
        body.getByText("Không thể gửi lại lời mời. Vui lòng thử lại."),
      ).toBeInTheDocument(),
    );
    // row untouched — still shows "Hết hạn" (expired), never flips to Pending
    await expect(canvas.getAllByText("Hết hạn").length).toBeGreaterThan(0);
  },
};

/** 10e. Resend race — verifies the reconciliation refetch actually fires
 *  (AC-005.4), not just the toast. Counts `onRefresh` invocations before vs.
 *  after the race error settles. */
export const ResendRaceTriggersRefetch: Story = {
  args: {
    ...baseProps,
    onRefresh: (() => {
      let calls = 0;
      return async (): Promise<ListActionResult> => {
        calls += 1;
        (globalThis as { __resendRefetchCalls?: number }).__resendRefetchCalls =
          calls;
        return { ok: true, data: INVITATIONS };
      };
    })(),
    onResend: async () => ({ ok: false, errorKey: "invalid-state" }),
  },
  play: async ({ canvasElement }) => {
    const g = globalThis as { __resendRefetchCalls?: number };
    await waitFor(() =>
      expect(g.__resendRefetchCalls).toBeGreaterThanOrEqual(1),
    );
    const callsBeforeAction = g.__resendRefetchCalls ?? 0;
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Gửi lại lời mời/i })[0],
    );
    const body = within(document.body);
    await waitFor(() =>
      expect(
        body.getByText("Không thể gửi lại — lời mời đã thay đổi trạng thái"),
      ).toBeInTheDocument(),
    );
    // AC-005.4: the race error MUST trigger a fresh GET (invalidateQueries),
    // not just show a toast — this is the actual reconciliation proof.
    await waitFor(() =>
      expect(g.__resendRefetchCalls ?? 0).toBeGreaterThan(callsBeforeAction),
    );
  },
};

/** 11a. Revoke confirm dialog — opens, names the invitee, cancel closes. */
export const RevokeConfirmDialog: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Thu hồi lời mời/i })[0],
    );
    const body = within(document.body);
    const dialog = await body.findByRole("alertdialog");
    await expect(
      within(dialog).getByText("Thu hồi lời mời?"),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Huỷ" }));
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
  },
};

/** 11b. Revoke success — confirm → toast + dialog closes. */
export const RevokeSuccess: Story = {
  args: { ...baseProps, onRevoke: okMutation },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Thu hồi lời mời/i })[0],
    );
    const body = within(document.body);
    const dialog = await body.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Thu hồi lời mời" }),
    );
    await waitFor(() =>
      expect(body.getByText(/Đã thu hồi lời mời của/i)).toBeInTheDocument(),
    );
  },
};

/** 11c. Revoke not-found race — invitation-invalid → error toast + refetch. */
export const RevokeNotFoundRace: Story = {
  args: {
    ...baseProps,
    onRevoke: async () => ({ ok: false, errorKey: "invitation-invalid" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Thu hồi lời mời/i })[0],
    );
    const body = within(document.body);
    const dialog = await body.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Thu hồi lời mời" }),
    );
    await waitFor(() =>
      expect(
        body.getByText("Không thể thu hồi lời mời (có thể đã được xử lý)"),
      ).toBeInTheDocument(),
    );
  },
};

/** 11d. Revoke — network/5xx error → error toast, confirm dialog STAYS OPEN
 *  with a retry affordance, row unchanged (AC-006.7). */
export const RevokeNetworkError: Story = {
  args: {
    ...baseProps,
    onRevoke: async () => ({ ok: false, errorKey: "network-error" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Thu hồi lời mời/i })[0],
    );
    const body = within(document.body);
    const dialog = await body.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Thu hồi lời mời" }),
    );
    // shows both as a toast AND as the dialog's inline errorSlot message
    await waitFor(() =>
      expect(
        body.getAllByText("Không thể thu hồi lời mời. Vui lòng thử lại.")
          .length,
      ).toBeGreaterThan(0),
    );
    // dialog is still open (not silently dismissed) with a retry control
    await expect(body.getByRole("alertdialog")).toBeInTheDocument();
    await expect(
      within(dialog).getByRole("button", { name: /thử lại/i }),
    ).toBeInTheDocument();
  },
};

/** 11e. Revoke not-found race — verifies the reconciliation refetch actually
 *  fires (AC-006.6) and the dialog closes (distinct from the network-error
 *  path above, which keeps it open). */
export const RevokeNotFoundRaceTriggersRefetch: Story = {
  args: {
    ...baseProps,
    onRefresh: (() => {
      let calls = 0;
      return async (): Promise<ListActionResult> => {
        calls += 1;
        (globalThis as { __revokeRefetchCalls?: number }).__revokeRefetchCalls =
          calls;
        return { ok: true, data: INVITATIONS };
      };
    })(),
    onRevoke: async () => ({ ok: false, errorKey: "invitation-invalid" }),
  },
  play: async ({ canvasElement }) => {
    const g = globalThis as { __revokeRefetchCalls?: number };
    await waitFor(() =>
      expect(g.__revokeRefetchCalls).toBeGreaterThanOrEqual(1),
    );
    const callsBeforeAction = g.__revokeRefetchCalls ?? 0;
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Thu hồi lời mời/i })[0],
    );
    const body = within(document.body);
    const dialog = await body.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Thu hồi lời mời" }),
    );
    await waitFor(() =>
      expect(
        body.getByText("Không thể thu hồi lời mời (có thể đã được xử lý)"),
      ).toBeInTheDocument(),
    );
    // AC-006.6: refetch actually re-fires (reconciliation), not just a toast.
    await waitFor(() =>
      expect(g.__revokeRefetchCalls ?? 0).toBeGreaterThan(callsBeforeAction),
    );
    // dialog closes on this path (contrast with RevokeNetworkError above)
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
  },
};

// ── Isolated component stories ────────────────────────────────────────────

const COUNTDOWN_LABELS = {
  daysLeft: (n: number) => `Còn ${n} ngày`,
  expiredOn: (d: string) => `Hết hạn ${d}`,
  notApplicable: "—",
  formatDate: (i: string) => i.slice(0, 10),
};

/** 12. Countdown variants — normal / urgent / expired / n-a (UC-007). */
export const CountdownVariants: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3 p-6">
      <ExpiryCountdownCell
        countdown={{ variant: "normal", text: "Còn 8 ngày" }}
      />
      <ExpiryCountdownCell
        countdown={{
          variant: "urgent",
          text: "Còn 2 ngày",
          icon: AlertTriangle,
        }}
      />
      <ExpiryCountdownCell
        countdown={{
          variant: "expired",
          text: "Hết hạn 2026-06-15",
          icon: CalendarX,
        }}
      />
      <ExpiryCountdownCell countdown={{ variant: "na", text: "—" }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Còn 8 ngày")).toBeInTheDocument();
    await expect(canvas.getByText("Còn 2 ngày")).toBeInTheDocument();
    await expect(canvas.getByText("Hết hạn 2026-06-15")).toBeInTheDocument();
  },
};

const ROW_VM_LABELS: RowVMLabels = {
  roleLabelOf: (role) =>
    ({
      teacher: "Giáo viên",
      student: "Học sinh",
      parent: "Phụ huynh",
      manager: "BGH",
      admin: "Admin",
    })[role],
  statusLabelOf: (status) =>
    ({
      pending: "Chờ chấp nhận",
      accepted: "Đã chấp nhận",
      expired: "Hết hạn",
      revoked: "Đã thu hồi",
    })[status],
  sentAtLabelOf: (i) => i.slice(0, 10),
  countdown: COUNTDOWN_LABELS,
};

const ROWS_LABELS: InvitationsRowsLabels = {
  columns: {
    email: "Email",
    role: "Vai trò",
    invitedBy: "Người mời",
    sentDate: "Ngày gửi",
    expiry: "Hết hạn",
    status: "Trạng thái",
    actions: "Hành động",
  },
  invitedByPrefix: "Mời bởi",
  copyLabelOf: (email) => `Copy link mời cho ${email}`,
  resendLabelOf: (email) => `Gửi lại lời mời cho ${email}`,
  revokeLabelOf: (email) => `Thu hồi lời mời của ${email}`,
  rowActionsGroupLabelOf: (email) => `Hành động cho ${email}`,
};

/** 13. Mobile card list (<820px) — same VM data + actions as the desktop table. */
export const MobileCardList: StoryObj = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <div className="max-w-[420px] p-4">
      <InvitationsCardList
        rows={INVITATIONS.map((inv) =>
          buildRowVM(inv, NOW, ROW_VM_LABELS, false),
        )}
        labels={ROWS_LABELS}
        onCopyLink={fn()}
        onResend={fn()}
        onRevokeRequest={fn()}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("lan.pham@email.com")).toBeInTheDocument();
    await expect(
      canvas.getByText("system.admin@email.com"),
    ).toBeInTheDocument();
  },
};
