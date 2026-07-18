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
    // succeeded chip removed, failed chip remains + duplicate error shown
    await waitFor(() => expect(body.queryByText("ok@x.com")).toBeNull());
    await expect(body.getByText("dupe@x.com")).toBeInTheDocument();
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
