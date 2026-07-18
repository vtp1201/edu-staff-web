import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { InviteAcceptScreen } from "./invite-accept-screen";

const meta = {
  title: "Auth/InviteAcceptScreen",
  component: InviteAcceptScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    loginHref: "/vi/login",
    onJoin: fn(async () => ({})),
    onSwitchAccount: fn(async () => ({})),
  },
} satisfies Meta<typeof InviteAcceptScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed-out visitor: message + a plain login link, no join affordance. */
export const AuthGate: Story = {
  args: { vm: { kind: "auth-gate" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Tham gia/i }),
    ).toBeNull();
  },
};

/** Signed-in: email shown, single enabled Join button. */
export const SignedInJoinIdle: Story = {
  args: {
    vm: { kind: "signed-in", email: "gv.lan@nguyendu.edu.vn", token: "tok-1" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Tham gia lời mời" }),
    ).toBeEnabled();
    await expect(canvas.getByText("gv.lan@nguyendu.edu.vn")).toBeVisible();
  },
};

/** Mid-submit: Join button shows the loading label + aria-busy. */
export const SignedInJoinLoading: Story = {
  args: {
    vm: { kind: "signed-in", email: "gv.lan@nguyendu.edu.vn", token: "tok-1" },
    // Never resolves — keeps the transition pending so the spinner state shows.
    onJoin: fn(() => new Promise<{ errorKey?: never }>(() => {})),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tham gia lời mời" }),
    );
    await waitFor(async () => {
      const btn = canvas.getByRole("button", { name: "Đang tham gia…" });
      await expect(btn).toHaveAttribute("aria-busy", "true");
      await expect(btn).toBeDisabled();
    });
  },
};

/** Email mismatch (403, F8): explicit error + the switch-account affordance. */
export const EmailMismatchError: Story = {
  args: {
    vm: { kind: "signed-in", email: "other@nguyendu.edu.vn", token: "tok-1" },
    onJoin: fn(async () => ({
      errorKey: "invitation-email-mismatch" as const,
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tham gia lời mời" }),
    );
    await waitFor(async () => {
      await expect(canvas.getByRole("alert")).toBeVisible();
    });
    await expect(
      canvas.getByRole("button", { name: "Đổi tài khoản?" }),
    ).toBeVisible();
  },
};

/** Sign-out fails: user stays signed in, an error explains it (AC-107.2). */
export const SwitchAccountFailure: Story = {
  args: {
    vm: { kind: "signed-in", email: "other@nguyendu.edu.vn", token: "tok-1" },
    onSwitchAccount: fn(async () => ({ errorKey: "logout-failed" })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Đổi tài khoản?" }),
    );
    await waitFor(async () => {
      await expect(canvas.getByRole("alert")).toBeVisible();
    });
  },
};

/** Generic network error: message shown, Join button re-enabled to retry. */
export const NetworkError: Story = {
  args: {
    vm: { kind: "signed-in", email: "gv.lan@nguyendu.edu.vn", token: "tok-1" },
    onJoin: fn(async () => ({ errorKey: "network-error" as const })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Tham gia lời mời" }),
    );
    await expect(await canvas.findByRole("alert")).toBeVisible();
    // Button re-enables for retry once the transition settles.
    await expect(
      await canvas.findByRole("button", { name: "Tham gia lời mời" }),
    ).toBeEnabled();
  },
};

/** Terminal expired state — no join button, contact-office chip. */
export const TokenExpired: Story = {
  args: { vm: { kind: "expired" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeVisible();
    await expect(canvas.getByText("Lời mời đã hết hạn")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Tham gia/i }),
    ).toBeNull();
  },
};

/** Terminal invalid state (covers not-found / used / revoked). */
export const TokenInvalid: Story = {
  args: { vm: { kind: "invalid" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeVisible();
    await expect(canvas.getByText("Liên kết không hợp lệ")).toBeVisible();
  },
};

/**
 * Missing `?token=` → same invalid render, and ZERO network call: the page
 * short-circuits to `{ kind: "invalid" }` before any action fires.
 */
export const MissingToken: Story = {
  args: { vm: { kind: "invalid" } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Liên kết không hợp lệ")).toBeVisible();
    await expect(args.onJoin).not.toHaveBeenCalled();
    await expect(args.onSwitchAccount).not.toHaveBeenCalled();
  },
};
