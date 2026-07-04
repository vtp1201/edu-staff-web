import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { mapNotification } from "../../infrastructure/mappers/notification.mapper";
import { MOCK_NOTIFICATIONS } from "../../infrastructure/repositories/mocks/fixtures";
import type { NotificationsCenterScreenProps } from "./notifications-center";
import { NotificationsCenterScreen } from "./notifications-center";

// ─── Base fixtures ────────────────────────────────────────────────────────────

const ALL_ITEMS = MOCK_NOTIFICATIONS.map((dto) => mapNotification(dto, "vi"));
const UNREAD_ITEMS = ALL_ITEMS.filter((n) => !n.read);

const noop = () => {};

const baseProps: NotificationsCenterScreenProps = {
  items: ALL_ITEMS,
  unreadCount: UNREAD_ITEMS.length,
  activeFilter: "all",
  isLoading: false,
  error: null,
  hasMore: false,
  isFetchingMore: false,
  isMutating: false,
  remainingCount: 0,
  onFilterChange: noop,
  onMarkRead: noop,
  onMarkAllRead: noop,
  onLoadMore: noop,
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof NotificationsCenterScreen> = {
  title: "Features/Notification/NotificationsCenterScreen",
  component: NotificationsCenterScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-[color:var(--edu-bg)]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof NotificationsCenterScreen>;

// ─── AC-1: Loading skeleton ───────────────────────────────────────────────────

/** Skeleton rows shown while the first page loads (AC-1). */
export const Loading: Story = {
  args: { ...baseProps, items: [], isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Skeleton container is present
    await expect(
      canvas.getByRole("heading", { name: /Trung tâm thông báo/i }),
    ).toBeInTheDocument();
    // Skeleton loading indicator present
    await expect(
      canvas.getByLabelText(/Đang tải thông báo/i),
    ).toBeInTheDocument();
  },
};

// ─── AC-2: Populated list (all tab) ─────────────────────────────────────────

/** Full notification list — all tabs, icon/badge/time visible (AC-2). */
export const Populated_AllTab: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // List is rendered with the correct aria role
    await expect(canvas.getByRole("log")).toBeInTheDocument();
    // At least one notification row visible
    const rows = canvas.getAllByRole("button", { name: /—/ });
    await expect(rows.length).toBeGreaterThan(0);
    // Unread count badge present
    await expect(
      canvas.getByLabelText(/thông báo chưa đọc/i),
    ).toBeInTheDocument();
  },
};

// ─── AC-3: Unread filter ──────────────────────────────────────────────────────

/** Unread tab — only unread rows shown (AC-3). */
export const UnreadFilter: Story = {
  args: {
    ...baseProps,
    items: UNREAD_ITEMS,
    activeFilter: "unread",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // "Chưa đọc" tab is active
    const tab = canvas.getByRole("tab", { name: /Chưa đọc/i });
    await expect(tab).toHaveAttribute("aria-selected", "true");
    // All displayed rows are unread (have the bold class — checked via aria-label)
    const rows = canvas.getAllByRole("button", { name: /chưa đọc/i });
    await expect(rows.length).toBeGreaterThan(0);
  },
};

// ─── AC-4: Mark single read ───────────────────────────────────────────────────

/** Clicking a row marks it as read — border disappears (AC-4). */
export const MarkSingleRead: Story = {
  args: {
    ...baseProps,
    items: ALL_ITEMS.map((item) =>
      item.id === "n-1" ? item : { ...item, read: true },
    ),
    unreadCount: 1,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The single unread row is present
    const unreadRow = canvas.getByRole("button", {
      name: /Kết quả học tập mới.*chưa đọc/i,
    });
    await expect(unreadRow).toBeInTheDocument();
    await userEvent.click(unreadRow);
    // After click the row interaction should fire (no throw expected)
  },
};

// ─── AC-5: Mark all read ──────────────────────────────────────────────────────

/** "Đánh dấu tất cả đã đọc" button enabled when unread > 0; disabled when 0 (AC-5). */
export const MarkAllRead: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /Đánh dấu tất cả đã đọc/i });
    await expect(btn).not.toBeDisabled();
    await userEvent.click(btn);
  },
};

/** Button is disabled when unread count is 0 (AC-5 edge). */
export const MarkAllRead_Disabled: Story = {
  args: {
    ...baseProps,
    items: ALL_ITEMS.map((n) => ({ ...n, read: true })),
    unreadCount: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /Đánh dấu tất cả đã đọc/i });
    await expect(btn).toBeDisabled();
  },
};

// ─── AC-6: Load more ─────────────────────────────────────────────────────────

/** "Xem thêm" button visible when hasMore=true; spinner while fetching (AC-6). */
export const LoadMore: Story = {
  args: {
    ...baseProps,
    items: ALL_ITEMS.slice(0, 8),
    hasMore: true,
    remainingCount: 8,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /Xem thêm/i });
    await expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
  },
};

/** "Đã hiển thị tất cả" shown when hasMore=false (AC-6 end-state). */
export const AllLoaded: Story = {
  args: { ...baseProps, hasMore: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Đã hiển thị tất cả")).toBeInTheDocument();
  },
};

// ─── AC-7: SSE prepend simulation ────────────────────────────────────────────

/**
 * Simulates a new notification prepended via SSE (AC-7).
 * The new item appears at the top of the list, unread, with an animation class.
 */
export const SSEPrepend: Story = {
  args: {
    ...baseProps,
    items: [
      {
        id: "n-new",
        type: "announcement",
        title: "Thông báo mới từ trường",
        body: "Trường sẽ nghỉ ngày 20/11 nhân dịp Ngày Nhà giáo Việt Nam.",
        ts: new Date().toISOString(),
        read: false,
      },
      ...ALL_ITEMS,
    ],
    unreadCount: UNREAD_ITEMS.length + 1,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // New item is at the top
    const rows = canvas.getAllByRole("button", { name: /—/ });
    await expect(rows[0]).toHaveAccessibleName(/Thông báo mới từ trường/i);
  },
};

// ─── AC-8: Empty state — unread filter ───────────────────────────────────────

/** All items read, unread filter selected → empty state "Tất cả đã đọc" (AC-8). */
export const EmptyUnread: Story = {
  args: {
    ...baseProps,
    items: [],
    unreadCount: 0,
    activeFilter: "unread",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Tất cả đã đọc")).toBeInTheDocument();
    const body = canvas.getByText(/Bạn đã đọc hết tất cả thông báo/i);
    await expect(body).toBeInTheDocument();

    // Canonical shared EmptyState: role=status container, aria-hidden icon,
    // accessible-contrast body token, no CTA button (US-E17.6 migration).
    const status = canvas.getByRole("status");
    await expect(status).toBeInTheDocument();
    const svg = status.querySelector("svg");
    await expect(svg).not.toBeNull();
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(body.className).toContain("text-edu-text-secondary");
    await expect(body.className).not.toContain("text-muted-foreground");
    await expect(body.className).not.toContain("text-edu-text-muted");
    await expect(status.querySelector("button")).toBeNull();
  },
};

// ─── AC-9: Empty state — no notifications ────────────────────────────────────

/** No notifications at all (new account) → empty state "Chưa có thông báo" (AC-9). */
export const EmptyAll: Story = {
  args: {
    ...baseProps,
    items: [],
    unreadCount: 0,
    activeFilter: "all",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Chưa có thông báo")).toBeInTheDocument();
    const body = canvas.getByText(/Thông báo sẽ xuất hiện ở đây/i);
    await expect(body).toBeInTheDocument();

    // Canonical shared EmptyState assertions (US-E17.6 migration).
    const status = canvas.getByRole("status");
    await expect(status).toBeInTheDocument();
    const svg = status.querySelector("svg");
    await expect(svg).not.toBeNull();
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(body.className).toContain("text-edu-text-secondary");
    await expect(body.className).not.toContain("text-muted-foreground");
    await expect(body.className).not.toContain("text-edu-text-muted");
    await expect(status.querySelector("button")).toBeNull();
  },
};

// ─── Error state ──────────────────────────────────────────────────────────────

/** Network error — error alert rendered with retry guidance. */
export const ErrorState: Story = {
  args: {
    ...baseProps,
    items: [],
    isLoading: false,
    error: "errors.network-error",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(
      canvas.getByText(/Không thể tải thông báo/i),
    ).toBeInTheDocument();
  },
};
