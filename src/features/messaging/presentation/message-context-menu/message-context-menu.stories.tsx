import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { MessageContextMenu } from "./message-context-menu";

const recentSentAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const oldSentAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const noop = () => {};

const meta: Meta<typeof MessageContextMenu> = {
  title: "Features/Messaging/MessageContextMenu",
  component: MessageContextMenu,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="h-screen" />
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    open: true,
    x: 120,
    y: 120,
    isMine: true,
    sentAt: recentSentAt,
    isGroup: true,
    selfIsGroupAdmin: true,
    onReply: noop,
    onPin: noop,
    onCopy: noop,
    onDelete: noop,
    onClose: noop,
  },
};
export default meta;

type Story = StoryObj<typeof MessageContextMenu>;
const body = () => within(document.body);

/** Own message, admin — all 4 items enabled. */
export const ContextMenu_OwnMessage_Admin: Story = {
  play: async () => {
    await waitFor(() => expect(body().getByRole("menu")).toBeInTheDocument());
    await expect(
      body().getByRole("menuitem", { name: "Ghim tin nhắn" }),
    ).toBeEnabled();
    await expect(body().getByRole("menuitem", { name: "Xóa" })).toBeEnabled();
  },
};

/** Own message, non-admin — pin disabled with hint. */
export const ContextMenu_OwnMessage_NonAdmin: Story = {
  args: { selfIsGroupAdmin: false },
  play: async () => {
    await waitFor(() => body().getByRole("menu"));
    await expect(
      body().getByRole("menuitem", { name: "Ghim tin nhắn" }),
    ).toBeDisabled();
    await expect(
      body().getByText("Chỉ admin mới có thể ghim"),
    ).toBeInTheDocument();
  },
};

/** Other message — delete is hidden. */
export const ContextMenu_OtherMessage: Story = {
  args: { isMine: false },
  play: async () => {
    await waitFor(() => body().getByRole("menu"));
    await expect(body().queryByText("Xóa")).not.toBeInTheDocument();
  },
};

/** Own message, expired — delete disabled with expired hint. */
export const ContextMenu_OwnMessage_Expired: Story = {
  args: { sentAt: oldSentAt },
  play: async () => {
    await waitFor(() => body().getByRole("menu"));
    await expect(body().getByRole("menuitem", { name: "Xóa" })).toBeDisabled();
    await expect(body().getByText("Đã quá 1 giờ")).toBeInTheDocument();
  },
};
