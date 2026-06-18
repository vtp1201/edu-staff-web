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
    const canvas = within(canvasElement);
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
