import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import { ConversationList } from "./conversation-list";

const CONVERSATIONS: ConversationEntity[] = [
  {
    id: "u1",
    type: "direct",
    name: "Trần Minh Quân",
    avatarInitials: "TQ",
    color: "success",
    lastMessage: "Cô có thể tham dự họp hội đồng lúc 15h không?",
    lastMessageTime: "10:15",
    lastMessageAt: "2026-09-15T10:15:00.000Z",
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: "g1",
    type: "group",
    name: "Lớp 11B2 — Toán",
    avatarInitials: "11B2",
    color: "primary",
    lastMessage: "Em áp dụng định lý Lagrange nhé...",
    lastMessageTime: "08:15",
    lastMessageAt: "2026-09-15T08:15:00.000Z",
    unreadCount: 3,
    memberCount: 33,
  },
];

const meta: Meta<typeof ConversationList> = {
  title: "Features/Messaging/ConversationList",
  component: ConversationList,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="h-screen w-[300px]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: {
    conversations: CONVERSATIONS,
    activeConversationId: null,
    isLoading: false,
    onSelect: () => {},
    onNewMessage: () => {},
    onCreateGroup: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof ConversationList>;

/** AC-1: Skeleton loader when loading conversations */
export const Loading: Story = {
  args: { isLoading: true, conversations: [] },
  play: async ({ canvasElement }) => {
    // Skeleton items rendered — verify loading state by checking skeleton elements exist
    const skeletons = canvasElement.querySelectorAll(
      "[data-slot='skeleton'], .animate-pulse",
    );
    await expect(skeletons.length).toBeGreaterThan(0);
  },
};

/** AC-2: Populated row — avatar, name, last message, time, unread badge */
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Trần Minh Quân")).toBeInTheDocument();
    await expect(
      canvas.getByText("Cô có thể tham dự họp hội đồng lúc 15h không?"),
    ).toBeInTheDocument();
  },
};

/** AC-9: Error state renders alert banner */
export const ErrorState: Story = {
  args: { conversations: [], loadError: "load-conversations-failed" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
  },
};

// ── US-E10.6 presence dot (FR-001) ──────────────────────────────────────────

const DIRECT = (
  presence: "online" | "recent" | "offline" | undefined,
): ConversationEntity => ({
  id: "u1",
  type: "direct",
  name: "Trần Minh Quân",
  avatarInitials: "TQ",
  color: "success",
  lastMessage: "Xin chào cô",
  lastMessageTime: "10:15",
  unreadCount: 0,
  presence,
});

/** AC-10.6.1.1 — online → filled success dot + sr-only "đang hoạt động". */
export const PresenceOnline: Story = {
  args: { conversations: [DIRECT("online")] },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-presence="online"]'),
    ).not.toBeNull();
    await expect(
      within(canvasElement).getByText("đang hoạt động"),
    ).toBeInTheDocument();
  },
};

/** AC-10.6.1.2 — recent → hollow dot + sr-only "vừa hoạt động gần đây". */
export const PresenceRecent: Story = {
  args: { conversations: [DIRECT("recent")] },
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector('[data-presence="recent"]');
    await expect(dot).not.toBeNull();
    await expect(dot?.className).toContain("border-edu-success");
    await expect(
      within(canvasElement).getByText("vừa hoạt động gần đây"),
    ).toBeInTheDocument();
  },
};

/** AC-10.6.1.3 — offline → no dot at all (never grey). */
export const PresenceOffline: Story = {
  args: { conversations: [DIRECT("offline")] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-presence]")).toBeNull();
  },
};

/** AC-10.6.1.4 — group conversation row → never a presence dot. */
export const PresenceGroupNoDot: Story = {
  args: {
    conversations: [
      {
        id: "g1",
        type: "group",
        name: "Lớp 11B2 — Toán",
        avatarInitials: "11B2",
        color: "primary",
        lastMessage: "Bài tập trang 87",
        lastMessageTime: "08:15",
        unreadCount: 0,
        memberCount: 33,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-presence]")).toBeNull();
  },
};

/**
 * AC-10.6.1.5/.7 — presence unresolved (records not merged yet) or fetch failed
 * → row renders offline-equivalent: no dot, no banner. The list itself is not
 * in a loading state (progressive, non-blocking).
 */
export const PresencePendingOrError: Story = {
  args: { conversations: [DIRECT(undefined)] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Trần Minh Quân"),
    ).toBeInTheDocument();
    await expect(canvasElement.querySelector("[data-presence]")).toBeNull();
  },
};

// ── US-E24.15 merged list (direct + group, no tabs) ─────────────────────────

const m = messages.messaging;

const conv = (
  id: string,
  type: ConversationEntity["type"],
  name: string,
  lastMessageAt?: string,
): ConversationEntity => ({
  id,
  type,
  name,
  avatarInitials: id.toUpperCase(),
  color: type === "group" ? "primary" : "success",
  lastMessage: "Tin nhắn gần nhất",
  lastMessageTime: "10:15",
  lastMessageAt,
  unreadCount: 0,
  ...(type === "group" ? { memberCount: 12 } : {}),
});

/** Deliberately NOT in display order — the list must re-sort them. */
const MIXED: ConversationEntity[] = [
  conv("d1", "direct", "Trần Minh Quân", "2026-09-13T09:00:00.000Z"),
  conv("g1", "group", "Lớp 10A1 — Toán", "2026-09-15T08:00:00.000Z"),
  conv("d2", "direct", "Lê Thị Hoa", "2026-09-14T08:00:00.000Z"),
  conv("g2", "group", "Tổ Toán – Tin học"),
];

const rowNames = (canvasElement: HTMLElement) =>
  Array.from(
    canvasElement.querySelectorAll<HTMLElement>("ul > li > button"),
  ).map((b) => b.getAttribute("aria-label") ?? "");

/**
 * AC — one merged list: direct + group rows together, no tablist, sorted by
 * `lastMessageAt` desc with the timestamp-less row last (stable fallback).
 */
export const MergedSortedList: Story = {
  args: { conversations: MIXED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The tablist is gone for good (AC's explicit DOM-shape assertion).
    await expect(canvasElement.querySelector('[role="tablist"]')).toBeNull();
    await expect(canvasElement.querySelector('[role="tab"]')).toBeNull();
    await expect(canvasElement.querySelector('[role="tabpanel"]')).toBeNull();
    // Exactly one list holding both types.
    await expect(canvasElement.querySelectorAll("ul").length).toBe(1);
    await expect(rowNames(canvasElement)).toEqual([
      `${m.openConversation.replace("{name}", "Lớp 10A1 — Toán")}, ${m.group.srLabel}`,
      m.openConversation.replace("{name}", "Lê Thị Hoa"),
      m.openConversation.replace("{name}", "Trần Minh Quân"),
      `${m.openConversation.replace("{name}", "Tổ Toán – Tin học")}, ${m.group.srLabel}`,
    ]);
    // Header: create-group first, then new-message, then the search field.
    const focusables = Array.from(
      canvasElement.querySelectorAll<HTMLElement>("button, input"),
    );
    await expect(focusables[0]).toHaveAccessibleName(m.group.createTitle);
    await expect(focusables[1]).toHaveAccessibleName(m.newMessage.button);
    await expect(focusables[2]).toBe(canvas.getByRole("searchbox"));
  },
};

/** Only direct rows → no group marker anywhere in the accessible names. */
export const OnlyDirect: Story = {
  args: {
    conversations: [
      conv("d1", "direct", "Trần Minh Quân", "2026-09-15T09:00:00.000Z"),
      conv("d2", "direct", "Lê Thị Hoa", "2026-09-14T08:00:00.000Z"),
    ],
  },
  play: async ({ canvasElement }) => {
    const names = rowNames(canvasElement);
    await expect(names.length).toBe(2);
    for (const name of names) {
      await expect(name).not.toContain(m.group.srLabel);
    }
  },
};

/** Only group rows → every row announces the "Nhóm" marker (not shape alone). */
export const OnlyGroups: Story = {
  args: {
    conversations: [
      conv("g1", "group", "Lớp 10A1 — Toán", "2026-09-15T09:00:00.000Z"),
      conv("g2", "group", "Tổ Toán – Tin học", "2026-09-14T08:00:00.000Z"),
    ],
  },
  play: async ({ canvasElement }) => {
    const names = rowNames(canvasElement);
    await expect(names.length).toBe(2);
    for (const name of names) {
      await expect(name).toContain(m.group.srLabel);
    }
  },
};

/** Search filters across BOTH types; a no-match query shows `search.noResults`. */
export const SearchCrossType: Story = {
  args: { conversations: MIXED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole("searchbox");
    await userEvent.type(box, "10A1");
    await expect(rowNames(canvasElement)).toEqual([
      `${m.openConversation.replace("{name}", "Lớp 10A1 — Toán")}, ${m.group.srLabel}`,
    ]);
    await userEvent.clear(box);
    await userEvent.type(box, "không tồn tại");
    await expect(canvas.getByText(m.search.noResults)).toBeInTheDocument();
  },
};

/** Zero conversations at all → one reused hint line (no second empty-state UI). */
export const EmptyWithCreatePermission: Story = {
  args: { conversations: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(m.group.emptySubtitle)).toBeInTheDocument();
  },
};

/** `canCreateGroup=false` (no `onCreateGroup`) → exactly ONE header button. */
export const NoCreatePermission: Story = {
  args: { conversations: MIXED, onCreateGroup: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: m.group.createTitle }),
    ).not.toBeInTheDocument();
    // Exactly ONE header affordance (row buttons live inside the <ul>).
    const headerButtons = Array.from(
      canvasElement.querySelectorAll<HTMLElement>("button"),
    ).filter((b) => !b.closest("ul"));
    await expect(headerButtons.length).toBe(1);
    const focusables = Array.from(
      canvasElement.querySelectorAll<HTMLElement>("button, input"),
    );
    await expect(focusables[0]).toHaveAccessibleName(m.newMessage.button);
    await expect(focusables[1]).toBe(canvas.getByRole("searchbox"));
    // The empty-state hint is create-permission gated too.
    await expect(
      within(canvasElement).queryByText(m.group.emptySubtitle),
    ).not.toBeInTheDocument();
  },
};

const VIEWPORT_375 = {
  viewports: {
    mobile375: {
      name: "Mobile 375",
      styles: { width: "375px", height: "812px" },
      type: "mobile" as const,
    },
  },
  defaultViewport: "mobile375",
};

/** 375px: both header icon buttons keep a ≥44px touch target (measured). */
export const Viewport375: Story = {
  args: { conversations: MIXED },
  parameters: { viewport: VIEWPORT_375 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of [m.group.createTitle, m.newMessage.button]) {
      const rect = canvas.getByRole("button", { name }).getBoundingClientRect();
      await expect(rect.width).toBeGreaterThanOrEqual(44);
      await expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    const root = canvasElement.firstElementChild as HTMLElement;
    await expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(375);
  },
};

/**
 * QA independent check (A11Y-101, WCAG 4.1.3) — the list body must be a real
 * `role="status" aria-live="polite"` region so a search-empty/loading state
 * transition is actually announced, not just visually swapped in. Verify the
 * DOM attributes directly (not just the visible text), and that it persists
 * across a state transition (populated → search-empty) rather than being
 * remounted (a remount would drop the SR announcement).
 */
export const LiveRegionAnnouncesStateChange: Story = {
  args: { conversations: MIXED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvasElement.querySelector('[role="status"]');
    await expect(region).not.toBeNull();
    await expect(region?.getAttribute("aria-live")).toBe("polite");
    // Same node reference before/after typing a no-match query — proves the
    // live region isn't torn down and recreated (which would silently drop
    // the SR announcement of the transition).
    const box = canvas.getByRole("searchbox");
    await userEvent.type(box, "không tồn tại");
    const regionAfter = canvasElement.querySelector('[role="status"]');
    await expect(regionAfter).toBe(region);
    await expect(canvas.getByText(m.search.noResults)).toBeInTheDocument();
  },
};
