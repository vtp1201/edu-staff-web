import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import type {
  NotificationEntity,
  NotificationFilter,
  NotificationPage,
} from "../../domain/entities/notification.entity";
import { NotificationDropdown } from "./notification-dropdown";

// ─── fixtures ────────────────────────────────────────────────────────────────

function item(
  id: string,
  over: Partial<NotificationEntity> = {},
): NotificationEntity {
  return {
    id,
    type: "discipline",
    titleKey: "notification_discipline_violation_title",
    titleParams: { severity: "MINOR" },
    bodyKey: "notification_discipline_violation_body",
    bodyParams: { severity: "MINOR" },
    ts: new Date(Date.now() - 10 * 60_000).toISOString(),
    read: false,
    ...over,
  };
}

const ALL_ITEMS = [
  item("n-1"),
  item("n-2", { type: "grade", read: true }),
  item("n-3", { type: "attendance" }),
];

function page(items: NotificationEntity[]): NotificationPage {
  return { items, nextCursor: null, hasMore: false };
}

/** Preview action that answers per-filter, recording the filters it was asked for. */
function previewAction(seen: NotificationFilter[]) {
  return async ({
    filter,
  }: {
    filter: NotificationFilter;
    cursor?: string;
  }) => {
    seen.push(filter);
    if (filter === "unread") return page(ALL_ITEMS.filter((n) => !n.read));
    // BE accepts type=system but has no producer yet → always empty (product-
    // accepted state per US-E24.13 AC, not an error).
    if (filter === "system") return page([]);
    return page(ALL_ITEMS);
  };
}

const meta: Meta<typeof NotificationDropdown> = {
  title: "Notification/NotificationDropdown",
  component: NotificationDropdown,
  // The footer "Xem tất cả thông báo" is a next-intl <Link> → App Router mock.
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      document.body.style.pointerEvents = "";
      return (
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false, gcTime: 0 } },
            })
          }
        >
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="w-[360px] rounded-[14px] border border-border bg-card">
              <Story />
            </div>
            <Toaster />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
  args: {
    tenantId: "tenant-acme",
    open: true,
    unreadCount: 2,
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof NotificationDropdown>;

/** Default tab is "Tất cả"; rows render in the compact variant. */
export const AllTab: Story = {
  args: { onFetchPreview: previewAction([]) },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("tab", { name: /Tất cả/ }),
    ).toHaveAttribute("aria-selected", "true");
    await waitFor(async () =>
      expect(
        await canvas.findAllByRole("button", { name: /(chưa đọc|đã đọc)$/ }),
      ).toHaveLength(3),
    );
  },
};

/** Loading → the 3-row skeleton, announced as busy. */
export const Loading: Story = {
  args: {
    onFetchPreview: () => new Promise<NotificationPage>(() => {}),
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: /Đang tải/ }),
    ).toHaveAttribute("aria-busy", "true");
  },
};

/** Fetch failure → error copy, no silent empty list. */
export const ErrorState: Story = {
  args: {
    onFetchPreview: async () => ({ errorKey: "network-error" }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /Không thể kết nối/,
    );
  },
};

/**
 * Tab switch drives the FILTER the action is called with — "Chưa đọc" →
 * `unread`, "Hệ thống" → `system` (which renders the dedicated empty copy
 * because BE has no system producer yet, per AC).
 */
const switchTabsSeen: NotificationFilter[] = [];

export const SwitchTabs: Story = {
  args: { onFetchPreview: previewAction(switchTabsSeen) },
  play: async ({ canvas }) => {
    const seen = switchTabsSeen;
    await canvas.findByRole("tab", { name: /Tất cả/ });

    await userEvent.click(canvas.getByRole("tab", { name: /Chưa đọc/ }));
    await waitFor(() => expect(seen).toContain("unread"));
    await waitFor(async () =>
      expect(
        await canvas.findAllByRole("button", { name: /chưa đọc$/ }),
      ).toHaveLength(2),
    );

    await userEvent.click(canvas.getByRole("tab", { name: /Hệ thống/ }));
    await waitFor(() => expect(seen).toContain("system"));
    await expect(
      await canvas.findByText("Không có thông báo hệ thống"),
    ).toBeInTheDocument();
  },
};

/** Arrow keys move between tabs (real tablist, not a menu). */
export const KeyboardTabNavigation: Story = {
  args: { onFetchPreview: previewAction([]) },
  play: async ({ canvas }) => {
    const allTab = await canvas.findByRole("tab", { name: /Tất cả/ });
    allTab.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: /Chưa đọc/ })).toHaveFocus(),
    );
  },
};

/**
 * Clicking an unread row marks it read; the panel stays open so the user sees
 * the row lose its bold + dot (AC-3). The fixture is STATEFUL here: the
 * mutation's `onSettled` invalidation refetches, so a stateless fixture would
 * hand back the pre-mutation row and hide a real optimistic-update bug behind
 * a fake one.
 */
const markOneReadStore = { items: ALL_ITEMS.map((n) => ({ ...n })) };

export const MarkOneRead: Story = {
  args: {
    onFetchPreview: async () => page(markOneReadStore.items),
    onMarkRead: fn(async (id: string) => {
      markOneReadStore.items = markOneReadStore.items.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {};
    }),
  },
  play: async ({ canvas, args }) => {
    const rows = await canvas.findAllByRole("button", { name: /chưa đọc$/ });
    await userEvent.click(rows[0]);
    await waitFor(() => expect(args.onMarkRead).toHaveBeenCalledWith("n-1"));
    // Optimistic: the row flips to "đã đọc" without waiting for a refetch.
    await waitFor(async () =>
      expect(
        await canvas.findAllByRole("button", { name: /đã đọc$/ }),
      ).toHaveLength(2),
    );
  },
};

/** A failing mark-read rolls the optimistic row back and toasts. */
export const MarkOneReadRollback: Story = {
  args: {
    onFetchPreview: previewAction([]),
    onMarkRead: fn(async () => ({ errorKey: "network-error" })),
  },
  play: async ({ canvas }) => {
    const rows = await canvas.findAllByRole("button", { name: /chưa đọc$/ });
    await expect(rows).toHaveLength(2);
    await userEvent.click(rows[0]);
    await expect(
      await within(document.body).findByText(/Không thể kết nối/),
    ).toBeInTheDocument();
    await waitFor(async () =>
      expect(
        await canvas.findAllByRole("button", { name: /chưa đọc$/ }),
      ).toHaveLength(2),
    );
  },
};

/** "Đánh dấu tất cả đã đọc" only exists when there IS something unread. */
export const MarkAllRead: Story = {
  args: {
    onFetchPreview: previewAction([]),
    onMarkAllRead: fn(async () => ({})),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }),
    );
    await waitFor(() => expect(args.onMarkAllRead).toHaveBeenCalled());
    await expect(
      await within(document.body).findByText("Đã đánh dấu tất cả là đã đọc"),
    ).toBeInTheDocument();
  },
};

/** unreadCount 0 → no mark-all affordance, and the unread tab has no pill. */
export const NoUnread: Story = {
  args: {
    unreadCount: 0,
    onFetchPreview: previewAction([]),
    onMarkAllRead: fn(async () => ({})),
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("tab", { name: /Tất cả/ });
    await expect(
      canvas.queryByRole("button", { name: "Đánh dấu tất cả đã đọc" }),
    ).toBeNull();
  },
};

/** Footer link points at the tenant-scoped centre and closes the panel. */
export const ViewAllClosesPanel: Story = {
  args: { onFetchPreview: previewAction([]) },
  play: async ({ canvas, args }) => {
    const link = await canvas.findByRole("link", {
      name: "Xem tất cả thông báo",
    });
    await expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("/t/tenant-acme/notifications"),
    );
    await userEvent.click(link);
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

/** `open: false` → no fetch at all (the shell must not pre-load the list). */
export const ClosedDoesNotFetch: Story = {
  args: {
    open: false,
    onFetchPreview: fn(async () => page(ALL_ITEMS)),
  },
  play: async ({ canvas, args }) => {
    await canvas.findByRole("tab", { name: /Tất cả/ });
    await expect(args.onFetchPreview).not.toHaveBeenCalled();
  },
};
