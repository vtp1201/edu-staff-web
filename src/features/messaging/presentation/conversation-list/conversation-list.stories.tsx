import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
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

/** AC-2: Populated direct tab — avatar, name, last message, time, unread badge */
export const DirectTabPopulated: Story = {
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
