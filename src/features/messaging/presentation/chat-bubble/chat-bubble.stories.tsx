import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import { cn } from "@/shared/utils";
import { ChatBubble } from "./chat-bubble";

const base: MessageEntity = {
  id: "m1",
  conversationId: "g1",
  from: "me",
  text: "Các em áp dụng định lý Lagrange vào bài tập nhé.",
  time: "08:15",
  date: "Hôm nay",
};

const meta: Meta<typeof ChatBubble> = {
  title: "Features/Messaging/ChatBubble",
  component: ChatBubble,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="w-[420px] bg-muted/30 p-4">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: { message: base, isGroup: true, showSender: false },
};
export default meta;

type Story = StoryObj<typeof ChatBubble>;

/** Reply quote inside own (primary) bubble. */
export const Reply_Quote_OwnBubble: Story = {
  args: {
    message: {
      ...base,
      replyTo: {
        messageId: "m0",
        senderName: "Trần Văn Bình",
        excerpt: "Cô ơi, bài tập trang 87 nộp khi nào ạ?",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Trần Văn Bình")).toBeInTheDocument();
  },
};

/** Reply quote inside received bubble (bg + pColor border). */
export const Reply_Quote_OtherBubble: Story = {
  args: {
    message: {
      ...base,
      from: "other",
      senderName: "Hoàng Thị Linh",
      senderInitials: "HL",
      senderColor: "error",
      replyTo: {
        messageId: "m0",
        senderName: "Nguyễn Thị Hương",
        excerpt: "Các em nộp trước tiết học ngày mai nhé!",
      },
    },
    showSender: true,
  },
};

/** Soft-deleted bubble — placeholder text. */
export const DeletedMessageBubble: Story = {
  args: { message: { ...base, isDeleted: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Tin nhắn đã bị xoá")).toBeInTheDocument();
  },
};

/** Highlight state (pin scroll-to flash). */
export const ChatBubble_Highlighted: Story = {
  args: { isHighlighted: true },
};

/** Loading skeleton — 5 staggered shimmer bubbles. */
export const LoadingSkeleton: Story = {
  render: () => (
    <ul className="flex flex-col gap-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <li
          key={i}
          className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
        >
          <span
            className="edu-msg-shimmer block h-7 rounded-[16px]"
            style={{ width: `${45 + (i % 3) * 12}%` }}
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  ),
};
