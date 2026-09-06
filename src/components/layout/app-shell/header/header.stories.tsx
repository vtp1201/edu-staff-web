import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import {
  expect,
  userEvent,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ThemeProvider } from "@/components/layout/theme-provider";
import type {
  SwitchTenantResult,
  TenantCardViewModel,
} from "@/components/shared/tenant-card";
import type { NotificationPage } from "@/features/notification/domain/entities/notification.entity";
import { withDarkTheme } from "@/test/storybook-dark-decorator";
import { Header } from "./header";

const meta: Meta<typeof Header> = {
  title: "Layout/Header",
  component: Header,
  // The avatar menu's language switcher owns `useRouter().replace()`
  // (next-intl navigation → next/navigation) → mount the App Router mock.
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      document.body.style.pointerEvents = "";
      return (
        <QueryClientProvider client={new QueryClient()}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <Story />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Teacher: Story = {
  args: { role: "teacher", userName: "Nguyen Van A" },
};
export const Student: Story = {
  args: { role: "student", userName: "Tran Thi B" },
};

/** Unread badge renders the real count and folds it into the bell's label. */
export const WithUnreadNotifications: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    tenantId: "tenant-acme",
    onFetchUnreadCount: async () => ({ count: 5 }),
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("link", { name: /5 thông báo chưa đọc/ }),
    ).toBeInTheDocument();
  },
};

/**
 * Regression: the header SHARES the ["notifications","unread-count"] cache
 * entry with the notifications centre, which stores `{ count }`. Reading it as
 * a bare number crashed the shell with "Objects are not valid as a React child".
 */
export const UnreadCountSeededByTheCentre: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    tenantId: "tenant-acme",
    onFetchUnreadCount: async () => ({ count: 0 }),
  },
  decorators: [
    (Story) => {
      const client = new QueryClient();
      client.setQueryData(["notifications", "unread-count"], { count: 7 });
      return (
        <QueryClientProvider client={client}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("link", { name: /7 thông báo chưa đọc/ }),
    ).toBeInTheDocument();
  },
};

/** Zero unread → no badge at all (no fake dot). */
export const NoUnreadNotifications: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    tenantId: "tenant-acme",
    onFetchUnreadCount: async () => ({ count: 0 }),
  },
  play: async ({ canvas }) => {
    const bell = await canvas.findByRole("link", { name: "Thông báo" });
    await expect(bell).toHaveTextContent("");
  },
};

const twoTenants: TenantCardViewModel[] = [
  {
    tenantId: "tenant-acme",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName: "THPT Chu Văn An",
    address: "10 Thụy Khuê, Tây Hồ, Hà Nội",
    logoColor: "primary",
    isCurrent: true,
    isSwitchable: true,
  },
  {
    tenantId: "tenant-beta",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName: "THCS Nguyễn Du",
    address: "44 Hàng Quạt, Hoàn Kiếm, Hà Nội",
    logoColor: "purple",
    isCurrent: false,
    isSwitchable: true,
  },
];

const noopSwitch = async (): Promise<SwitchTenantResult> => ({ ok: true });

/** ≥2 memberships → the "Đổi trường" item + current-tenant block render. */
export const MultiTenant: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    memberships: twoTenants,
    currentTenantId: "tenant-acme",
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    const item = await body.findByRole("menuitem", { name: /Đổi trường/ });
    await expect(item).toBeInTheDocument();
    await userEvent.click(item);
    await expect(await body.findByRole("dialog")).toBeInTheDocument();
  },
};

/**
 * Regression guard for A11Y-001 (US-E23.1): the dialog is opened via the REAL
 * composed flow (avatar trigger → dropdown → "Đổi trường" menuitem), then Escape
 * must dismiss it AND return focus to the user-menu trigger — proving the
 * DropdownMenu→Dialog handoff is not a keyboard trap (WCAG 2.1.2 / 2.4.3).
 */
export const MultiTenant_CloseRestoresFocus: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    memberships: twoTenants,
    currentTenantId: "tenant-acme",
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole("button", {
      name: "Menu người dùng",
    });
    await userEvent.click(trigger);
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: /Đổi trường/ }),
    );
    // The dialog opens only after the dropdown has fully unmounted (see
    // Header.openSwitchDialog). Two invariants that were broken before the fix:
    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    // (1) focus moves INTO the dialog, not stuck on the trigger behind the modal
    await expect(dialog.contains(document.activeElement)).toBe(true);
    // (2) the dropdown is gone — otherwise its dismissable layer swallows the
    //     Escape meant for the dialog (the original keyboard trap).
    await expect(body.queryByRole("menu")).not.toBeInTheDocument();

    // Escape dismisses the dialog (proves it is NOT a keyboard trap). Wait for
    // the close animation to unmount the node before asserting absence.
    await userEvent.keyboard("{Escape}");
    await waitForElementToBeRemoved(() => body.queryByRole("dialog"));
    // ...and focus returns to the header's user-menu trigger, not <body>.
    await expect(document.activeElement).toBe(trigger);
  },
};

/** Exactly 1 membership → zero-noise: no "Đổi trường" item anywhere. */
export const SingleTenantZeroNoise: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    memberships: [twoTenants[0]],
    currentTenantId: "tenant-acme",
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    await expect(
      body.queryByRole("menuitem", { name: /Đổi trường/ }),
    ).not.toBeInTheDocument();
  },
};

/** Switch action wired but no membership data (fetch-fail []) → zero-noise. */
export const FetchFailZeroNoise: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    memberships: [],
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    await expect(
      body.queryByRole("menuitem", { name: /Đổi trường/ }),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E24.12 — the standalone theme icon is GONE from the header bar; the whole
 * theme/language surface lives in the avatar menu now. Guard against it being
 * re-added next to the bell.
 */
export const NoStandaloneThemeIcon: Story = {
  args: { role: "teacher", userName: "Nguyen Van A", tenantId: "tenant-acme" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    ).toBeInTheDocument();
    // The header bar exposes exactly: mobile nav toggle, bell, avatar.
    await expect(
      canvas.queryByRole("button", { name: /theme|giao diện|Chế độ tối/i }),
    ).not.toBeInTheDocument();
  },
};

/** Menu order (design v3): tenant → Đổi trường → Hồ sơ → Chế độ tối → Ngôn ngữ → Đăng xuất. */
export const MenuOpen: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    tenantId: "tenant-acme",
    memberships: twoTenants,
    currentTenantId: "tenant-acme",
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    const menu = await body.findByRole("menu");
    const order = Array.from(
      menu.querySelectorAll(
        '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]',
      ),
    ).map((el) => el.textContent);
    await expect(order).toEqual([
      "Đổi trường",
      "Hồ sơ",
      "Chế độ tối",
      "Tiếng Việt",
      "English",
      "Đăng xuất",
    ]);
    // The language options are menu items themselves (keyboard-reachable),
    // under the "Ngôn ngữ" label row.
    await expect(within(menu).getByText("Ngôn ngữ")).toBeInTheDocument();
  },
};

/**
 * AC: toggling "Chế độ tối" flips `<html class="dark">` and the menu STAYS
 * open (the user sees the theme change in place). Needs the real next-themes
 * provider — without it `setTheme` is a no-op.
 */
export const DarkModeToggle: Story = {
  args: { role: "teacher", userName: "Nguyen Van A", tenantId: "tenant-acme" },
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="sb-e24-12-theme"
      >
        <Story />
      </ThemeProvider>
    ),
  ],
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    const row = await body.findByRole("menuitemcheckbox", {
      name: /Chế độ tối/,
    });
    await expect(row).toHaveAttribute("aria-checked", "false");

    await userEvent.click(row);
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    );
    // menu still open (onSelect preventDefault) — same node, now checked
    await expect(body.getByRole("menu")).toBeInTheDocument();
    await expect(
      body.getByRole("menuitemcheckbox", { name: /Chế độ tối/ }),
    ).toHaveAttribute("aria-checked", "true");

    // restore so the class does not leak into the next story
    await userEvent.click(
      body.getByRole("menuitemcheckbox", { name: /Chế độ tối/ }),
    );
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(false),
    );
  },
};

/**
 * AC: the current locale is the checked option; picking the other one replaces
 * the SAME path with the new locale prefix (no BE call, no client state).
 *
 * The options are `role="menuitemradio"` rows of a Radix
 * `DropdownMenuRadioGroup` — see `LanguageSwitchKeyboard` for why.
 */
export const LanguageSwitch: Story = {
  args: { role: "teacher", userName: "Nguyen Van A", tenantId: "tenant-acme" },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    const vi = await body.findByRole("menuitemradio", { name: "Tiếng Việt" });
    const en = await body.findByRole("menuitemradio", { name: "English" });
    await expect(vi).toHaveAttribute("aria-checked", "true");
    await expect(en).toHaveAttribute("aria-checked", "false");

    await userEvent.click(en);
    await waitFor(() => expect(getRouter().replace).toHaveBeenCalled());
    // Story pathname is "/" (App Router mock) → same path, new locale prefix.
    await expect(getRouter().replace).toHaveBeenCalledWith("/en");
  },
};

/**
 * WCAG 2.1.1 regression guard (US-E24.12 review): the language options used to
 * be native radios inside a plain `<div role="radiogroup">`, which Radix's menu
 * content makes keyboard-UNREACHABLE (it blocks Tab and roving-focuses only its
 * own item collection). As `menuitemradio` rows they join that collection, so
 * arrow keys reach them and Enter selects.
 */
export const LanguageSwitchKeyboard: Story = {
  args: { role: "teacher", userName: "Nguyen Van A", tenantId: "tenant-acme" },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole("button", {
      name: "Menu người dùng",
    });
    trigger.focus();
    // Keyboard-only: open the menu, then walk the roving-focus collection.
    await userEvent.keyboard("{Enter}");
    const body = within(document.body);
    const en = await body.findByRole("menuitemradio", { name: "English" });

    for (let i = 0; i < 12 && document.activeElement !== en; i++) {
      await userEvent.keyboard("{ArrowDown}");
    }
    await expect(en).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(getRouter().replace).toHaveBeenCalled());
    await expect(getRouter().replace).toHaveBeenCalledWith("/en");
  },
};

/**
 * Real 375px touch-target proof (QA gap): the existing mobile rows only
 * assert `toHaveClass("max-[820px]:min-h-11")` — a class-name check, not a
 * measurement. `@storybook/addon-viewport` isn't installed (repo-wide gap,
 * see `detail-panel-header.stories.tsx`), so this resizes the REAL Playwright
 * viewport via `vitest/browser`'s `page.viewport()` before measuring
 * `getBoundingClientRect().height` on the new dark-mode row and both
 * language rows (US-E24.12 AC "menu item ≥44px touch trên mobile").
 */
export const MobileTouchTargets: Story = {
  args: { role: "teacher", userName: "Nguyen Van A", tenantId: "tenant-acme" },
  play: async ({ canvas }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 812);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    const darkRow = await body.findByRole("menuitemcheckbox", {
      name: /Chế độ tối/,
    });
    const vi = await body.findByRole("menuitemradio", { name: "Tiếng Việt" });
    const en = await body.findByRole("menuitemradio", { name: "English" });
    // Radix's open-menu entrance runs a brief scale animation (data-state=open
    // → animate-in zoom-in-95) — measuring mid-transition undershoots the real
    // 44px floor by a couple of px. Wait for it to settle before measuring.
    for (const row of [darkRow, vi, en]) {
      await waitFor(() =>
        expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44),
      );
    }
  },
};

/** Dark theme rendering of the header chrome (US-E24.12 dark token pass). */
export const Dark: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    tenantId: "tenant-acme",
    memberships: twoTenants,
    currentTenantId: "tenant-acme",
    onSwitchTenant: noopSwitch,
  },
  globals: { theme: "dark" },
  decorators: [withDarkTheme],
  play: async ({ canvas }) => {
    // The dark token pass is only real if the .dark block actually wins —
    // assert the handoff value (T_DARK card) rather than trusting the class.
    await expect(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--edu-card")
        .trim(),
    ).toBe("#1e2630");
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    await expect(await body.findByRole("menu")).toBeInTheDocument();
  },
};

// ─── US-E24.13 — bell: dropdown on desktop, plain Link on mobile ─────────────

/**
 * The preview Server Action ref. Returns an EMPTY page on purpose: this story
 * proves the trigger/viewport split and the panel's ARIA shell, not its rows —
 * row rendering, tab filtering and the optimistic mutations are proven in
 * `notification-dropdown.stories.tsx` against the component directly.
 */
const emptyPreview = async (): Promise<NotificationPage> => ({
  items: [],
  nextCursor: null,
  hasMore: false,
});

const dropdownArgs = {
  role: "teacher" as const,
  userName: "Nguyen Van A",
  tenantId: "tenant-acme",
  onFetchUnreadCount: async () => ({ count: 2 }),
  onFetchNotificationsPreview: emptyPreview,
  onMarkRead: async () => ({}),
  onMarkAllRead: async () => ({}),
};

/**
 * AC (desktop ≥640px): the bell OPENS the panel instead of navigating — so it
 * must be a `button`, never a `link`, and the panel is a `dialog` (Radix
 * Popover) containing a REAL tablist. Escape closes it and returns focus to the
 * bell (WCAG 2.1.2 / 2.4.3) — Radix Popover's own default, no custom wiring.
 */
export const BellDropdownDesktop: Story = {
  args: dropdownArgs,
  play: async ({ canvas }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(1280, 900);

    const bell = await canvas.findByRole("button", {
      name: /Thông báo — 2 thông báo chưa đọc/,
    });
    // Not a link: opening a panel must not navigate anywhere.
    await expect(canvas.queryByRole("link", { name: /Thông báo/ })).toBeNull();

    await userEvent.click(bell);
    const body = within(document.body);
    const panel = await body.findByRole("dialog", { name: "Thông báo" });
    await expect(within(panel).getByRole("tablist")).toBeInTheDocument();
    await expect(getRouter().push).not.toHaveBeenCalled();

    await userEvent.keyboard("{Escape}");
    await waitForElementToBeRemoved(() =>
      body.queryByRole("dialog", { name: "Thông báo" }),
    );
    await expect(document.activeElement).toBe(bell);
  },
};

/**
 * AC (mobile <640px): unchanged behaviour — the bell stays a `Link` to the
 * notifications centre and there is NO popover trigger in the accessibility
 * tree (the desktop span is `display:none`, so it is genuinely absent, not just
 * visually hidden).
 */
export const BellMobileStaysALink: Story = {
  args: dropdownArgs,
  play: async ({ canvas }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 812);
    const link = await canvas.findByRole("link", { name: /Thông báo/ });
    await expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("/t/tenant-acme/notifications"),
    );
    await expect(
      canvas.queryByRole("button", { name: /Thông báo/ }),
    ).toBeNull();
    // Restore the default desktop viewport for the stories that follow.
    await page.viewport(1280, 900);
  },
};
