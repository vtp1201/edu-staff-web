import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { PresenceState } from "@/features/messaging/domain/entities/presence";
import { ChatWindow } from "./chat-window";

const directConversation = (
  presence: PresenceState | undefined,
  lastActiveAt?: string,
): ConversationEntity => ({
  id: "u1",
  type: "direct",
  name: "Trần Minh Quân",
  avatarInitials: "TQ",
  color: "success",
  lastMessage: "",
  lastMessageTime: "10:15",
  unreadCount: 0,
  presence,
  lastActiveAt,
});

const meta: Meta<typeof ChatWindow> = {
  title: "Features/Messaging/ChatWindow",
  component: ChatWindow,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="h-screen">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: {
    conversation: directConversation("online"),
    messages: [],
    isLoading: false,
    onSend: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof ChatWindow>;

/** AC-10.6.2.1 — DM header online → filled dot + "Đang hoạt động" caption. */
export const HeaderOnline: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-presence="online"]'),
    ).not.toBeNull();
    await expect(
      within(canvasElement).getByText("Đang hoạt động"),
    ).toBeInTheDocument();
  },
};

/** AC-10.6.2.2 — recent → hollow dot + "Hoạt động {n} phút trước" (real n). */
export const HeaderRecent: Story = {
  args: {
    conversation: directConversation(
      "recent",
      new Date(Date.now() - 3 * 60_000).toISOString(),
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-presence="recent"]'),
    ).not.toBeNull();
    await expect(
      within(canvasElement).getByText(/phút trước/),
    ).toBeInTheDocument();
  },
};

/** AC-10.6.2.3 — offline WITH a known bucket → "Hoạt động hôm qua", no dot. */
export const HeaderOfflineWithBucket: Story = {
  args: {
    conversation: directConversation("offline", "2026-07-13T09:00:00.000Z"),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-presence]")).toBeNull();
    await expect(
      within(canvasElement).getByText("Hoạt động hôm qua"),
    ).toBeInTheDocument();
  },
};

/** AC-10.6.2.3/.4 — offline WITHOUT a bucket → no dot + no caption (OQ-1). */
export const HeaderOfflineNoCaption: Story = {
  args: { conversation: directConversation("offline") },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-presence]")).toBeNull();
    await expect(
      within(canvasElement).queryByText("Hoạt động hôm qua"),
    ).not.toBeInTheDocument();
    await expect(
      within(canvasElement).queryByText("Đang hoạt động"),
    ).not.toBeInTheDocument();
  },
};

/**
 * AC-10.6.2.6 / AC-10.6.3.1 — group header regression: member-count subtitle
 * only, NEVER a per-member presence dot.
 */
export const GroupHeaderNoDot: Story = {
  args: {
    conversation: {
      id: "g1",
      type: "group",
      name: "Lớp 11B2 — Toán",
      avatarInitials: "11B2",
      color: "primary",
      lastMessage: "",
      lastMessageTime: "08:15",
      unreadCount: 0,
      memberCount: 33,
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-presence]")).toBeNull();
    await expect(
      within(canvasElement).getByText("33 thành viên"),
    ).toBeInTheDocument();
  },
};
