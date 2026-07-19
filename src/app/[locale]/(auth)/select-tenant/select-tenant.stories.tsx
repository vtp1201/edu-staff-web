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
