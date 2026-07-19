import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  SwitchTenantResult,
  TenantCardViewModel,
} from "@/components/shared/tenant-card";
import { Toaster } from "@/components/ui/sonner";
import { SelectTenant } from "./select-tenant";
import { SelectTenantSkeleton } from "./select-tenant-skeleton";

const cards: TenantCardViewModel[] = [
  {
    tenantId: "tenant-acme",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName: "THPT Chu Văn An",
    address: "10 Thụy Khuê, Tây Hồ, Hà Nội",
    logoColor: "primary",
    isCurrent: false,
    isSwitchable: true,
  },
  {
    tenantId: "tenant-beta",
    roles: ["principal"],
    status: "ACTIVE",
    tenantName: "THCS Nguyễn Du",
    address: "44 Hàng Quạt, Hoàn Kiếm, Hà Nội",
    logoColor: "purple",
    isCurrent: false,
    isSwitchable: true,
  },
  {
    tenantId: "tenant-gamma",
    roles: ["parent"],
    status: "ACTIVE",
    tenantName: "Tiểu học Lê Quý Đôn",
    address: "8 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội",
    logoColor: "teal",
    isCurrent: false,
    isSwitchable: true,
  },
];

const resolveOk: (t: string, r: string) => Promise<SwitchTenantResult> =
  async () => ({ ok: true });

const resolveForbidden: (t: string, r: string) => Promise<SwitchTenantResult> =
  async () => ({
    ok: false,
    errorKey: "forbidden",
  });

const resolveNetwork: (t: string, r: string) => Promise<SwitchTenantResult> =
  async () => ({ ok: false, errorKey: "network" });

const meta: Meta<typeof SelectTenant> = {
  title: "Auth/SelectTenant",
  component: SelectTenant,
  // The card grid's TenantCard reuses next-intl + the error state owns
  // `useRouter().refresh()` → mount the App Router mock (US-E18.15 precedent).
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
        <Toaster />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SelectTenant>;

/** AC-001.1 — ≥2 memberships → heading + personalized subheading + N cards,
 *  no "Hiện tại" badge on any card (pre-entry). */
export const ScreenShown_CardGrid: Story = {
  args: {
    screenState: {
      kind: "cards",
      userName: "Cô Lan",
      count: 3,
      cards,
    },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Chọn trường để tiếp tục" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(/Xin chào Cô Lan — tài khoản của bạn thuộc 3 trường\./),
    ).toBeVisible();
    // one real <button> card per membership
    const cardButtons = canvas.getAllByRole("button", {
      name: /Chu Văn An|Nguyễn Du|Lê Quý Đôn/,
    });
    await expect(cardButtons).toHaveLength(3);
    // no "current" badge anywhere (pre-entry)
    await expect(canvas.queryByText("Hiện tại")).not.toBeInTheDocument();
    // footnote always rendered (US-E23.1 shipped)
    await expect(
      canvas.getByText(/Bạn có thể đổi trường bất kỳ lúc nào/),
    ).toBeVisible();
  },
};

/** AC-001.2 — profile name unavailable → name-less subheading, never
 *  "undefined"/blank. */
export const NameUnavailableFallback: Story = {
  args: {
    screenState: { kind: "cards", userName: null, count: 3, cards },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Tài khoản của bạn thuộc 3 trường."),
    ).toBeVisible();
    await expect(canvas.queryByText(/undefined/i)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Xin chào/)).not.toBeInTheDocument();
  },
};

/** AC-004.1 / NFR-003 — the route-level skeleton (loading.tsx delegates here). */
export const Loading_Skeleton: StoryObj<typeof SelectTenantSkeleton> = {
  render: () => (
    <SelectTenantSkeleton loadingLabel="Đang tải danh sách trường…" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // sr-only aria-live status is present for screen readers
    await expect(
      canvas.getByText("Đang tải danh sách trường…"),
    ).toBeInTheDocument();
    // decorative shimmer container is aria-hidden (not announced twice)
    await expect(
      canvasElement.querySelector('[aria-hidden="true"]'),
    ).toBeInTheDocument();
    // no interactive controls in the skeleton
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

/** AC-003.1/003.2 — 0 ACTIVE → empty message + keyboard-operable escape action. */
export const Empty_ZeroActive: Story = {
  args: {
    screenState: { kind: "empty" },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Bạn chưa thuộc tổ chức nào")).toBeVisible();
    // a real, keyboard-focusable next-action control (logout)
    const logout = canvas.getByRole("button", { name: "Đăng xuất" });
    logout.focus();
    await expect(logout).toHaveFocus();
    // no card grid rendered
    await expect(canvas.queryByText(/Chu Văn An/)).not.toBeInTheDocument();
  },
};

/** AC-004.1 — INT-001 fetch failure → explicit error + retry, no card grid. */
export const Error_FetchFail: Story = {
  args: {
    screenState: { kind: "error" },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      /Không tải được danh sách trường/,
    );
    await expect(canvas.getByRole("button", { name: /Thử lại/ })).toBeVisible();
    await expect(canvas.queryByText(/Chu Văn An/)).not.toBeInTheDocument();
    // Fixed per DEF-QA-E23.2-01 (fe-lead, post-QA fix): role="alert" now lives
    // on a wrapper <div> around the <h1>, not on the heading element itself —
    // an explicit ARIA role only overrides the implicit role of the element
    // it's placed on, so the <h1> stays exposed as "heading" to AT
    // heading-navigation while the wrapper still announces via role="alert".
    await expect(
      canvas.getByRole("heading", {
        name: /Không tải được danh sách trường/,
      }),
    ).toBeInTheDocument();
  },
};

/** AC-004.2 — retry triggers a server re-fetch via router.refresh() (the
 *  mechanism that re-runs page.tsx; the actual re-render is out of a
 *  component-level story's reach). */
export const Error_RetrySuccess: Story = {
  args: {
    screenState: { kind: "error" },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Thử lại/ }));
    await waitFor(() => expect(getRouter().refresh).toHaveBeenCalled());
  },
};

/** AC-004.3 — retry failing again keeps the error state (no auto-redirect loop:
 *  the component never navigates itself, it only re-requests a server refresh). */
export const Error_RetryFailAgain: Story = {
  args: {
    screenState: { kind: "error" },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retry = canvas.getByRole("button", { name: /Thử lại/ });
    await userEvent.click(retry);
    await waitFor(() => expect(getRouter().refresh).toHaveBeenCalled());
    // still in the error state — no navigation, no card grid appeared
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(canvas.queryByText(/Chu Văn An/)).not.toBeInTheDocument();
  },
};

/** AC-005.1/005.2 — card activation shows per-card loading. On {ok:true} the
 *  action would redirect (tree unmounts); in a sandbox the loading state simply
 *  stays, which is what we assert (no crash on the unreachable success branch). */
export const SelectSuccess: Story = {
  args: {
    screenState: { kind: "cards", userName: "Cô Lan", count: 3, cards },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Nguyễn Du/ }));
    await waitFor(() =>
      expect(args.onSwitchTenant).toHaveBeenCalledWith(
        "tenant-beta",
        "principal",
      ),
    );
    // per-card loading affordance appears (aria-busy on the clicked card)
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /Nguyễn Du/ })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    );
  },
};

/** AC-005.3 / FR-009 — 403 target rejection → inline card error, caller stays
 *  on THIS screen (no navigation). */
export const Select403: Story = {
  args: {
    screenState: { kind: "cards", userName: "Cô Lan", count: 3, cards },
    onSwitchTenant: fn(resolveForbidden),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Nguyễn Du/ }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /Không thể chuyển sang trường này/,
    );
    // still on the screen (heading present, no navigation)
    await expect(
      canvas.getByRole("heading", { name: "Chọn trường để tiếp tục" }),
    ).toBeVisible();
  },
};

/** AC-005.4 / FR-010 — network/5xx → toast + card returns to idle. */
export const SelectNetworkError: Story = {
  args: {
    screenState: { kind: "cards", userName: "Cô Lan", count: 3, cards },
    onSwitchTenant: fn(resolveNetwork),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("button", { name: /Nguyễn Du/ });
    await userEvent.click(card);
    // generic error toast fires (rendered in document.body by sonner)
    const body = within(document.body);
    await expect(
      await body.findByText(/Chuyển trường thất bại/),
    ).toBeInTheDocument();
    // card returns to idle (no longer busy)
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /Nguyễn Du/ }),
      ).not.toHaveAttribute("aria-busy", "true"),
    );
  },
};

/** AC-005.5 / FR-011 — a mid-flow 401 folds into today's generic network path
 *  (the reactive-refresh interceptor is deferred per decision 0018). Same
 *  observable behavior as SelectNetworkError — documented for honesty. */
export const Select401Retry: Story = {
  args: {
    screenState: { kind: "cards", userName: "Cô Lan", count: 3, cards },
    onSwitchTenant: fn(resolveNetwork),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Nguyễn Du/ }));
    const body = within(document.body);
    await expect(
      await body.findByText(/Chuyển trường thất bại/),
    ).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// QA-authored: NFR-002 responsive proof at real 320/375px viewport (fe-qa-
// playwright pass). `parameters.viewport` is inert here (addon-viewport isn't
// installed) — resize the underlying `@vitest/browser-playwright` page
// directly, same technique as `tenant-switch-dialog.stories.tsx`/
// `email-verify-dialog.stories.tsx`. Also covers the "max-length name/address"
// edge case from the Edge Case Matrix (use-cases.md §5).
// ---------------------------------------------------------------------------
async function resizeTo(width: number) {
  const { page } = await import("vitest/browser");
  await page.viewport(width, 800);
}

const longNameCards: TenantCardViewModel[] = [
  {
    tenantId: "tenant-long",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName:
      "Trường Trung Học Phổ Thông Chuyên Nguyễn Huệ - Cơ Sở Đào Tạo Chất Lượng Cao",
    address:
      "Số 123, Đường Nguyễn Văn Cừ Nối Dài, Phường Long Biên, Quận Long Biên, Thành Phố Hà Nội",
    logoColor: "primary",
    isCurrent: false,
    isSwitchable: true,
  },
  ...cards.slice(1),
];

/**
 * QA — 320px/375px: card grid must not cause horizontal overflow of the
 * document, even with a long tenant name/address (Edge Case Matrix,
 * use-cases.md §5: "long name/address in card truncates per NFR-002, no
 * overflow at 320px"). NFR-002 also claims "no layout break at 320px".
 *
 * DEFECT (fe-qa-playwright, US-E23.2 QA pass) — this currently FAILS with a
 * real (not curated-mock-only) long tenant name: at 320px the card's
 * `getBoundingClientRect().right` measures ~690px (should be ≤321px),
 * `document.documentElement.scrollWidth` likewise balloons to ~690px — a
 * genuine horizontal-overflow bug, reproduced directly (not a test artifact;
 * confirmed via an isolated throwaway story + `page.viewport()` + manual
 * `getBoundingClientRect()` measurement). With the SHORT curated mock names
 * used by `ScreenShown_CardGrid` ("THPT Chu Văn An" etc.) the same layout
 * fits fine (~326px) — this is why the design-review Evidence block's "320px
 * OK, no overflow" claim held for the happy-path story but is false for the
 * Edge-Case-Matrix's own "max-length name/address" scenario. Root cause
 * (same class of bug as `tenant-switch-dialog.stories.tsx`'s DEFECT note):
 * `CardsState`'s `<div className="grid gap-3">` is a CSS Grid container, and
 * `TenantCard`'s `<button>` is a direct grid item with no `min-w-0` — per
 * CSS Grid's default `min-width: auto` track sizing, the item refuses to
 * shrink below its content's intrinsic min-content width, so the `truncate`
 * class inside the card (on the address span) never actually gets a
 * constrained box to truncate against. Fix belongs to `fe-nextjs-engineer`
 * (add `min-w-0` to the grid container's card wrapper, or to `TenantCard`'s
 * root `<button>` itself) — NOT fixed here (QA writes test code only). Kept
 * as a red test per this repo's convention (see
 * `tenant-switch-dialog.stories.tsx`'s `Viewport320`/`Viewport375`).
 */
export const Viewport_CardGrid_NoOverflow: Story = {
  args: {
    screenState: {
      kind: "cards",
      userName: "Cô Lan",
      count: longNameCards.length,
      cards: longNameCards,
    },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const width of [320, 375]) {
      await resizeTo(width);
      await waitFor(() => expect(window.innerWidth).toBe(width));
      // no horizontal scroll on the document itself
      await waitFor(() =>
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          width + 1,
        ),
      );
      // the long-name card is still present and its box does not overflow
      // its own grid cell (card width tracks the viewport, not intrinsic
      // content width)
      const card = canvas.getByRole("button", { name: /Nguyễn Huệ/ });
      const cardBox = card.getBoundingClientRect();
      await expect(cardBox.right).toBeLessThanOrEqual(width + 1);
    }
  },
};

/** QA — 320px: error state's retry button remains reachable and meets the
 *  44px minimum touch-target height (accessibility.md). */
export const Viewport_Error_320: Story = {
  args: {
    screenState: { kind: "error" },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await resizeTo(320);
    await waitFor(() => expect(window.innerWidth).toBe(320));
    await waitFor(() =>
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(321),
    );
    const retry = canvas.getByRole("button", { name: /Thử lại/ });
    await expect(retry).toBeVisible();
    const box = retry.getBoundingClientRect();
    await expect(box.height).toBeGreaterThanOrEqual(44);
  },
};

/** QA — 320px: empty state's logout escape action remains reachable and
 *  meets the 44px minimum touch-target height. */
export const Viewport_Empty_320: Story = {
  args: {
    screenState: { kind: "empty" },
    onSwitchTenant: fn(resolveOk),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await resizeTo(320);
    await waitFor(() => expect(window.innerWidth).toBe(320));
    await waitFor(() =>
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(321),
    );
    const logout = canvas.getByRole("button", { name: "Đăng xuất" });
    await expect(logout).toBeVisible();
    const box = logout.getBoundingClientRect();
    await expect(box.height).toBeGreaterThanOrEqual(44);
  },
};
