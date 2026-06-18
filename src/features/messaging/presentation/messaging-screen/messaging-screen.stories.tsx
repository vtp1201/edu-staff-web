import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import { MessagingScreen } from "./messaging-screen";
import type {
  CreateConversationResult,
  GetMessagesResult,
  SendMessageResult,
} from "./messaging-screen.i-vm";

const CONVERSATIONS: ConversationEntity[] = [
  {
    id: "u1",
    type: "direct",
    name: "Trần Minh Quân",
    avatarInitials: "TQ",
    color: "success",
    lastMessage: "Cô có thể tham dự họp hội đồng lúc 15h không?",
    lastMessageTime: "10:15",
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: "u3",
    type: "direct",
    name: "Nguyễn Văn Đức",
    avatarInitials: "ND",
    color: "purple",
    lastMessage: "Cảm ơn cô nhiều!",
    lastMessageTime: "14:37",
    unreadCount: 0,
    isOnline: false,
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

const CONTACTS: ContactEntity[] = [
  {
    id: "u1",
    name: "Trần Minh Quân",
    role: "Hiệu trưởng",
    avatarInitials: "TQ",
    color: "success",
    isOnline: true,
  },
  {
    id: "u4",
    name: "Lê Thị Hoa",
    role: "Giáo viên Hóa",
    avatarInitials: "LH",
    color: "warning",
    isOnline: true,
  },
];

const MESSAGES: Record<string, MessageEntity[]> = {
  u1: [
    {
      id: "u1-1",
      conversationId: "u1",
      from: "other",
      text: "Chào cô Hương, cô nộp kế hoạch giảng dạy trước thứ 6 nhé?",
      time: "08:30",
      date: "Hôm nay",
    },
    {
      id: "u1-2",
      conversationId: "u1",
      from: "me",
      text: "Dạ thầy, em sẽ nộp trước thứ 5 ạ.",
      time: "08:45",
      date: "Hôm nay",
    },
  ],
  g1: [
    {
      id: "g1-1",
      conversationId: "g1",
      from: "system",
      text: "Nguyễn Thị Hương đã tạo nhóm Lớp 11B2 — Toán",
      time: "01/09/2025",
      date: "01/09/2025",
    },
    {
      id: "g1-2",
      conversationId: "g1",
      from: "other",
      text: "Cô ơi, bài tập trang 87 nộp khi nào ạ?",
      time: "07:30",
      date: "Hôm nay",
      senderName: "Trần Văn Bình",
      senderInitials: "TB",
      senderColor: "teal",
    },
    {
      id: "g1-3",
      conversationId: "g1",
      from: "me",
      text: "Các em nộp trước tiết học ngày mai nhé!",
      time: "07:45",
      date: "Hôm nay",
    },
  ],
};

// Mutable store so a sent message survives the post-mutation refetch — mirrors
// the persistent mock repo and keeps the optimistic interaction deterministic.
const STORE: Record<string, MessageEntity[]> = structuredClone(MESSAGES);

const sendMessageAction = async (
  conversationId: string,
  text: string,
): Promise<SendMessageResult> => {
  const message: MessageEntity = {
    id: `srv-${Date.now()}`,
    conversationId,
    from: "me",
    text,
    time: "10:20",
    date: "Hôm nay",
  };
  STORE[conversationId] = [...(STORE[conversationId] ?? []), message];
  return { ok: true, value: message };
};

const createConversationAction = async (
  contactIds: string[],
): Promise<CreateConversationResult> => {
  const contact = CONTACTS.find((c) => c.id === contactIds[0]);
  return {
    ok: true,
    value: {
      id: contact?.id ?? "c-new",
      type: "direct",
      name: contact?.name ?? "Mới",
      avatarInitials: contact?.avatarInitials ?? "?",
      color: contact?.color ?? "primary",
      lastMessage: "",
      lastMessageTime: "",
      unreadCount: 0,
      isOnline: contact?.isOnline ?? false,
    },
  };
};

const getMessagesAction = async (
  conversationId: string,
): Promise<GetMessagesResult> => ({
  ok: true,
  value: STORE[conversationId] ?? [],
});

const meta: Meta<typeof MessagingScreen> = {
  title: "Features/Messaging/MessagingScreen",
  component: MessagingScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <NextIntlClientProvider locale="vi" messages={messages}>
          <QueryClientProvider client={client}>
            <div className="h-screen">
              <Story />
            </div>
          </QueryClientProvider>
        </NextIntlClientProvider>
      );
    },
  ],
  args: {
    initialConversations: CONVERSATIONS,
    initialContacts: CONTACTS,
    sendMessageAction,
    createConversationAction,
    getMessagesAction,
  },
};
export default meta;

type Story = StoryObj<typeof MessagingScreen>;

export const DirectTabPopulated: Story = {};

/** AC-2: Groups tab — rounded-xl avatar, member-count subtitle, per-sender names in chat */
export const GroupTabPopulated: Story = {
  args: {
    initialConversations: CONVERSATIONS.filter((c) => c.type === "group"),
    getMessagesAction: async () => ({ ok: true, value: MESSAGES.g1 ?? [] }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Lớp 11B2 — Toán")).toBeInTheDocument();
    // Member-count subtitle via t("chat.members")
    await waitFor(() =>
      expect(canvas.getByText(/thành viên/i)).toBeInTheDocument(),
    );
  },
};

export const ChatWindowOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("log")).toBeInTheDocument());
  },
};

export const SendMessage_Optimistic: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByLabelText(/nhập tin nhắn/i);
    await userEvent.type(input, "Tin nhắn thử nghiệm");
    const send = canvas.getByRole("button", { name: /gửi/i });
    await userEvent.click(send);
    await waitFor(() =>
      expect(canvas.getByText("Tin nhắn thử nghiệm")).toBeInTheDocument(),
    );
  },
};

export const EmptyState: Story = {
  args: { initialConversations: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/chọn một cuộc trò chuyện/i),
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { initialConversations: [] },
};

export const LoadError: Story = {
  args: {
    initialConversations: [],
    loadError: "load-conversations-failed",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
  },
};

export const MobileView: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
