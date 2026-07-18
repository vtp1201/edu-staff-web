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

/**
 * Keyboard-only operation (WCAG 2.1 AA, `.claude/rules/accessibility.md`):
 * Tab reaches the Join button and Enter activates it — no pointer needed.
 */
export const KeyboardOnlyJoin: Story = {
  args: {
    vm: { kind: "signed-in", email: "gv.lan@nguyendu.edu.vn", token: "tok-1" },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const joinButton = canvas.getByRole("button", { name: "Tham gia lời mời" });

    await userEvent.tab();
    await waitFor(() => expect(joinButton).toHaveFocus());
    await expect(joinButton).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(args.onJoin).toHaveBeenCalledWith("tok-1"));
  },
};

/**
 * Keyboard-only switch-account escape hatch reachable via Tab (2nd stop),
 * activatable via Enter.
 */
export const KeyboardOnlySwitchAccount: Story = {
  args: {
    vm: { kind: "signed-in", email: "gv.lan@nguyendu.edu.vn", token: "tok-1" },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const switchButton = canvas.getByRole("button", { name: "Đổi tài khoản?" });

    await userEvent.tab(); // Join button
    await userEvent.tab(); // Đổi tài khoản? link/button
    await waitFor(() => expect(switchButton).toHaveFocus());

    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(args.onSwitchAccount).toHaveBeenCalledWith("tok-1"),
    );
  },
};

/**
 * Keyboard-only "Back to sign in" link on the terminal invalid state
 * (A11Y-005 fix) is reachable via Tab and is a real link (Enter navigates
 * natively — nothing to assert beyond focusability + href here).
 */
export const KeyboardOnlyBackToLogin: Story = {
  args: { vm: { kind: "invalid" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const backLink = canvas.getByRole("link", { name: "Quay lại đăng nhập" });

    await userEvent.tab();
    await waitFor(() => expect(backLink).toHaveFocus());
    await expect(backLink).toHaveAttribute("href", "/vi/login");
  },
};

const VIEWPORT_320 = {
  viewports: {
    mobile320: {
      name: "Mobile 320",
      styles: { width: "320px", height: "700px" },
      type: "mobile" as const,
    },
  },
  defaultViewport: "mobile320",
};

const VIEWPORT_768 = {
  viewports: {
    tablet768: {
      name: "Tablet 768",
      styles: { width: "768px", height: "1024px" },
      type: "tablet" as const,
    },
  },
  defaultViewport: "tablet768",
};

/**
 * 320px: no fixed-width overflow (`.claude/rules/accessibility.md`), brand
 * panel hidden (matches `login`'s established `<lg` breakpoint), card content
 * (Join button) fits within the viewport width.
 */
export const Viewport320: Story = {
  args: {
    vm: { kind: "signed-in", email: "gv.lan@nguyendu.edu.vn", token: "tok-1" },
  },
  parameters: { viewport: VIEWPORT_320 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const joinButton = canvas.getByRole("button", { name: "Tham gia lời mời" });
    const rect = joinButton.getBoundingClientRect();
    await expect(rect.right).toBeLessThanOrEqual(320);

    // Brand panel is `hidden lg:flex` — must not render at 320px.
    const brandPanel =
      canvasElement.querySelector<HTMLElement>('[class*="lg:flex"]');
    await expect(brandPanel).not.toBeNull();
    if (brandPanel) {
      await expect(getComputedStyle(brandPanel).display).toBe("none");
    }
  },
};

/**
 * 768px: below the `lg` breakpoint the brand panel still stays hidden (only
 * `card` content shows), no overflow.
 */
export const Viewport768: Story = {
  args: {
    vm: { kind: "signed-in", email: "gv.lan@nguyendu.edu.vn", token: "tok-1" },
  },
  parameters: { viewport: VIEWPORT_768 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const joinButton = canvas.getByRole("button", { name: "Tham gia lời mời" });
    const rect = joinButton.getBoundingClientRect();
    await expect(rect.right).toBeLessThanOrEqual(768);
  },
};

/**
 * Dark-mode regression guard (A11Y-001, story.md Evidence): the error/warning
 * chip pairs must stay high-contrast in dark mode. Prior to the self-audit fix,
 * `.dark {}` collapsed `--edu-error-text` to the LIGHT-mode `--edu-error`
 * (~2.2:1 on the un-overridden `--edu-error-light` background). This locks in
 * the fixed dark-mode-specific values so a future edit to `globals.css` can't
 * silently regress it.
 */
export const DarkModeEmailMismatchContrast: Story = {
  args: {
    vm: { kind: "signed-in", email: "other@nguyendu.edu.vn", token: "tok-1" },
    onJoin: fn(async () => ({
      errorKey: "invitation-email-mismatch" as const,
    })),
  },
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const root = doc.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    try {
      const canvas = within(canvasElement);
      await userEvent.click(
        canvas.getByRole("button", { name: "Tham gia lời mời" }),
      );
      const alert = await canvas.findByRole("alert");
      const style = getComputedStyle(alert);
      // Fixed dark-mode values: --edu-error-light #5c0007 / --edu-error-text
      // #ffdad6 — NOT the light-mode #fef2ef/#e34a3f pairing.
      await expect(style.backgroundColor).toBe("rgb(92, 0, 7)");
      await expect(style.color).toBe("rgb(255, 218, 214)");
    } finally {
      if (!hadDark) root.classList.remove("dark");
    }
  },
};

/**
 * Dark-mode regression guard for the terminal "expired" state's warning tint
 * (paired fix alongside the error tint above).
 */
export const DarkModeTokenExpiredContrast: Story = {
  args: { vm: { kind: "expired" } },
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const root = doc.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    try {
      const canvas = within(canvasElement);
      const badge = canvasElement.querySelector<HTMLElement>(
        ".bg-edu-warning-light",
      );
      await expect(badge).not.toBeNull();
      if (badge) {
        const style = getComputedStyle(badge);
        // Fixed dark-mode value: --edu-warning-light #4d3300.
        await expect(style.backgroundColor).toBe("rgb(77, 51, 0)");
      }
      await expect(canvas.getByRole("alert")).toBeVisible();
    } finally {
      if (!hadDark) root.classList.remove("dark");
    }
  },
};
