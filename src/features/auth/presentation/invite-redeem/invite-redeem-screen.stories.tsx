import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { InviteRedeemVM } from "./invite-redeem.i-vm";
import { InviteRedeemScreen } from "./invite-redeem-screen";

const PREVIEW: InviteRedeemVM = {
  kind: "form",
  token: "tok-1",
  preview: {
    email: "lan.pham@nguyendu.edu.vn",
    tenantName: "THPT Nguyễn Du",
    roles: ["TEACHER"],
    expiresAt: "2026-08-14T02:00:00Z",
  },
};

const meta = {
  title: "Auth/InviteRedeemScreen",
  component: InviteRedeemScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="vi"
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    vm: PREVIEW,
    loginHref: "/vi/login",
    acceptHref: "/vi/invitations/accept?token=tok-1",
    onRedeem: fn(async () => ({})),
  },
} satisfies Meta<typeof InviteRedeemScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fill the three inputs so the submit gate opens. */
async function fillForm(
  canvas: ReturnType<typeof within>,
  password = "Matkhau@123",
) {
  await userEvent.type(canvas.getByLabelText("Họ và tên"), "Phạm Thị Lan");
  await userEvent.type(canvas.getByLabelText("Mật khẩu"), password);
  await userEvent.type(canvas.getByLabelText("Nhập lại mật khẩu"), password);
}

/**
 * The skeleton's own live region. Two `role="status"` nodes coexist while the
 * lookup is pending (the busy skeleton + the persistent, still-empty success
 * announcement), so pick the busy one explicitly.
 */
function busyRegion(canvas: ReturnType<typeof within>): HTMLElement {
  const region = canvas
    .getAllByRole("status")
    .find((el: HTMLElement) => el.getAttribute("aria-busy") === "true");
  if (!region) throw new Error("no aria-busy status region found");
  return region;
}

/**
 * Preview resolved: school + role + the invited email, read-only. There is NO
 * email input — the address comes from the invitation (ADR 0131 D5).
 */
export const PreviewAndForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Giáo viên")).toBeVisible();
    await expect(canvas.getByText("lan.pham@nguyendu.edu.vn")).toBeVisible();
    await expect(
      canvas.getByText(/Bạn được mời tham gia THPT Nguyễn Du/),
    ).toBeVisible();
    // The invited email is DISPLAYED, never an editable field.
    await expect(canvas.queryByLabelText(/^Email/i)).toBeNull();
    // Gate closed until the form is filled.
    await expect(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    ).toBeDisabled();
  },
};

/** An invitation with no roles renders the fallback instead of an empty slot. */
export const PreviewWithoutRole: Story = {
  args: {
    vm: { ...PREVIEW, preview: { ...PREVIEW.preview, roles: [] } } as never,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Chưa gán vai trò"),
    ).toBeVisible();
  },
};

/** Happy path: submits exactly (token, password, fullName) — no email argument. */
export const SubmitSuccess: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(() =>
      expect(args.onRedeem).toHaveBeenCalledWith(
        "tok-1",
        "Matkhau@123",
        "Phạm Thị Lan",
      ),
    );
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

/** Mid-submit: loading label + aria-busy, button locked against a double POST. */
export const SubmitLoading: Story = {
  args: {
    onRedeem: fn(() => new Promise<{ errorKey?: never }>(() => {})),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(async () => {
      const btn = canvas.getByRole("button", { name: "Đang tạo tài khoản…" });
      await expect(btn).toHaveAttribute("aria-busy", "true");
      await expect(btn).toBeDisabled();
    });
  },
};

/** Mismatched confirmation is caught client-side — zero network call. */
export const PasswordMismatch: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Họ và tên"), "Phạm Thị Lan");
    await userEvent.type(canvas.getByLabelText("Mật khẩu"), "Matkhau@123");
    await userEvent.type(
      canvas.getByLabelText("Nhập lại mật khẩu"),
      "Matkhau@124",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(async () => {
      await expect(canvas.getByText("Hai mật khẩu chưa khớp.")).toBeVisible();
    });
    await expect(args.onRedeem).not.toHaveBeenCalled();
    await expect(canvas.getByLabelText("Nhập lại mật khẩu")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

/** BE's password policy (400 USER_WEAK_PASSWORD) blames the password field. */
export const WeakPasswordFromServer: Story = {
  args: {
    onRedeem: fn(async () => ({
      errorKey: "invalid-input" as const,
      issues: ["passwordWeak" as const],
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas, "matkhau1");
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(async () => {
      await expect(canvas.getByText(/Mật khẩu chưa đủ mạnh/)).toBeVisible();
    });
    const pw = canvas.getByLabelText("Mật khẩu");
    await expect(pw).toHaveAttribute("aria-invalid", "true");
    // The field error is linked, not just coloured (WCAG 3.3.1/1.4.1).
    await expect(pw.getAttribute("aria-describedby")).toMatch(/password-error/);
    // The form stays usable — this is a fixable problem.
    await expect(canvas.getByLabelText("Nhập lại mật khẩu")).toBeVisible();
  },
};

/** 422 blaming fullName. */
export const FullNameRejectedByServer: Story = {
  args: {
    onRedeem: fn(async () => ({
      errorKey: "invalid-input" as const,
      issues: ["fullNameInvalid" as const],
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(async () => {
      await expect(canvas.getByText("Họ và tên không hợp lệ.")).toBeVisible();
    });
    await expect(canvas.getByLabelText("Họ và tên")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

/**
 * 409 `INVITATION_ACCOUNT_EXISTS`: not a dead end — the visitor is routed into
 * the EXISTING signed-in accept flow, and told their password was not applied
 * to the existing account.
 */
export const AccountAlreadyExists: Story = {
  args: {
    onRedeem: fn(async () => ({ errorKey: "account-exists" as const })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(async () => {
      await expect(canvas.getByText("Email này đã có tài khoản")).toBeVisible();
    });
    const cta = canvas.getByRole("link", { name: "Đăng nhập để tham gia" });
    await expect(cta).toHaveAttribute(
      "href",
      "/vi/invitations/accept?token=tok-1",
    );
    // The form is gone: retrying redemption here can never succeed.
    await expect(canvas.queryByLabelText("Mật khẩu")).toBeNull();
  },
};

/**
 * A REPLAYED token (a second redeem) is 410, not 409 — dead-link copy that
 * never suggests retrying, and the form is removed.
 */
export const ReplayedTokenIsDeadLink: Story = {
  args: {
    onRedeem: fn(async () => ({ errorKey: "link-invalid" as const })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(async () => {
      await expect(
        canvas.getByText("Liên kết không còn hiệu lực"),
      ).toBeVisible();
    });
    await expect(canvas.queryByLabelText("Mật khẩu")).toBeNull();
    // Never routed to the "you already have an account" path.
    await expect(canvas.queryByText("Email này đã có tài khoản")).toBeNull();
  },
};

/** 429: calm, non-alarming copy; the form stays so the visitor can retry later. */
export const RateLimitedOnSubmit: Story = {
  args: {
    onRedeem: fn(async () => ({ errorKey: "rate-limited" as const })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(async () => {
      await expect(canvas.getByRole("alert").textContent).toMatch(
        /quá nhiều lần/,
      );
    });
    await expect(canvas.getByLabelText("Mật khẩu")).toBeVisible();
  },
};

/** Transport failure: retryable, inline, form preserved. */
export const NetworkErrorOnSubmit: Story = {
  args: {
    onRedeem: fn(async () => ({ errorKey: "network-error" as const })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    );
    await waitFor(async () => {
      await expect(canvas.getByRole("alert").textContent).toMatch(
        /Không thể kết nối/,
      );
    });
    await expect(
      canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" }),
    ).toBeEnabled();
  },
};

/**
 * NEW in US-E18.59 (ADR 0072): the preview is fetched by the browser, so the
 * screen has a real pending state. It is announced to assistive tech rather
 * than being a silent grey block.
 */
export const LookupLoading: Story = {
  args: { vm: { kind: "loading" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = busyRegion(canvas);
    await expect(status).toHaveAttribute("aria-busy", "true");
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(canvas.getByText("Đang tải lời mời…")).toBeInTheDocument();
    await expect(canvas.queryByLabelText("Mật khẩu")).toBeNull();
    // The persistent success live region exists already, but is still silent —
    // nothing has resolved yet.
    await expect(canvas.getByTestId("redeem-announcement")).toHaveTextContent(
      "",
    );
  },
};

/**
 * A11Y-001 (fix round, WCAG 4.1.3): the FAILURE transitions announce via
 * `InvitationNotice`'s `role="alert"`, but `loading → form` used to be a silent
 * DOM swap — the skeleton's own live region unmounts, and removing a live
 * region announces nothing. A persistent, initially-empty `role="status"` span
 * survives the swap, so the resolution is announced in the region the AT is
 * already observing.
 */
export const LoadedAnnouncesToScreenReaders: Story = {
  render: function LookupTransition(args) {
    const [vm, setVm] = useState<InviteRedeemVM>({ kind: "loading" });
    useEffect(() => {
      const id = setTimeout(() => setVm(PREVIEW), 30);
      return () => clearTimeout(id);
    }, []);
    return <InviteRedeemScreen {...args} vm={vm} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const live = canvas.getByTestId("redeem-announcement");
    // Present BEFORE the content arrives, and sr-only (visual design unchanged).
    await expect(live).toHaveAttribute("role", "status");
    await expect(live).toHaveAttribute("aria-live", "polite");
    await expect(live).toHaveClass("sr-only");
    await expect(live).toHaveTextContent("");

    await waitFor(async () => {
      await expect(canvas.getByLabelText("Mật khẩu")).toBeVisible();
    });
    // Same node (not a re-inserted one) now carries the resolution — the
    // announcement lands one effect-commit after the form paints.
    await expect(canvas.getByTestId("redeem-announcement")).toBe(live);
    await waitFor(async () => {
      await expect(live).toHaveTextContent(
        "Đã tải xong lời mời. Vui lòng điền thông tin bên dưới.",
      );
    });
    // The skeleton's own busy region is gone; only the success one remains.
    await expect(canvas.queryByText("Đang tải lời mời…")).toBeNull();
  },
};

/** Page-load 410 (unknown/used/revoked token): no form at all. */
export const LookupLinkInvalid: Story = {
  args: { vm: { kind: "invalid" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeVisible();
    await expect(canvas.getByText("Liên kết không còn hiệu lực")).toBeVisible();
    await expect(canvas.queryByLabelText("Mật khẩu")).toBeNull();
    await expect(
      canvas.getByRole("link", { name: "Quay lại đăng nhập" }),
    ).toHaveAttribute("href", "/vi/login");
  },
};

/** Page-load 410 expired — distinct copy from "invalid". */
export const LookupExpired: Story = {
  args: { vm: { kind: "expired" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Lời mời đã hết hạn")).toBeVisible();
    await expect(canvas.queryByText("Liên kết không còn hiệu lực")).toBeNull();
  },
};

/** Page-load 429 — shared lookup/redeem budget. */
export const LookupRateLimited: Story = {
  args: { vm: { kind: "rate-limited" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Bạn đã thử quá nhiều lần"),
    ).toBeVisible();
  },
};

/** Page-load 403 — the inviting school is not active. */
export const LookupTenantInactive: Story = {
  args: { vm: { kind: "tenant-inactive" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Trường chưa hoạt động"),
    ).toBeVisible();
  },
};

/** Page-load transport/unknown failure — the one state that invites a reload. */
export const LookupError: Story = {
  args: { vm: { kind: "error" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Không tải được lời mời"),
    ).toBeVisible();
  },
};
