import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import { GroupInfoPanel } from "./group-info-panel";

const GROUP: GroupEntity = {
  id: "g1",
  name: "Lớp 11B2 — Toán",
  description: "Nhóm trao đổi bài tập lớp 11B2.",
  kind: "class",
  color: "primary",
  conversationId: "g1",
  members: [
    {
      userId: "me",
      name: "Nguyễn Thị Hương",
      initials: "NH",
      color: "primary",
      role: "admin",
      isOnline: true,
    },
    {
      userId: "u-b1",
      name: "Trần Văn Bình",
      initials: "TB",
      color: "teal",
      role: "member",
      isOnline: true,
    },
    {
      userId: "u-l1",
      name: "Hoàng Thị Linh",
      initials: "HL",
      color: "error",
      role: "member",
      isOnline: false,
    },
  ],
  pinnedMessages: [],
};

const noop = () => {};
const ACTIONS = {
  onOpenChange: noop,
  onRename: noop,
  onAddMembers: noop,
  onRemoveMember: noop,
  onLeave: noop,
  onDelete: noop,
  onPinnedClick: noop,
};

const meta: Meta<typeof GroupInfoPanel> = {
  title: "Features/Messaging/GroupInfoPanel",
  component: GroupInfoPanel,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    open: true,
    group: GROUP,
    isLoading: false,
    selfIsAdmin: true,
    selfId: "me",
    ...ACTIONS,
  },
};
export default meta;

type Story = StoryObj<typeof GroupInfoPanel>;
const body = () => within(document.body);

/** Open — member list, empty pinned, leave button. */
export const GroupInfoPanel_Open: Story = {
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("THÀNH VIÊN")).toBeInTheDocument(),
    );
    await expect(body().getByText("Rời nhóm")).toBeInTheDocument();
    await expect(
      body().getByText("Chưa có tin nhắn được ghim."),
    ).toBeInTheDocument();
  },
};

/** Admin view — edit icon, add-member CTA, remove buttons, delete button. */
export const GroupInfoPanel_AdminView: Story = {
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("+ Thêm thành viên")).toBeInTheDocument(),
    );
    await expect(body().getByText("Xoá nhóm")).toBeInTheDocument();
    await expect(
      body().getByLabelText("Xóa Trần Văn Bình khỏi nhóm"),
    ).toBeInTheDocument();
  },
};

/** Non-admin view — no admin-only elements. */
export const GroupInfoPanel_NonAdminView: Story = {
  args: { selfIsAdmin: false },
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("THÀNH VIÊN")).toBeInTheDocument(),
    );
    await expect(
      body().queryByText("+ Thêm thành viên"),
    ).not.toBeInTheDocument();
    await expect(body().queryByText("Xoá nhóm")).not.toBeInTheDocument();
  },
};

/** Delete confirm — inline two-step confirm in footer. */
export const GroupInfoPanel_DeleteConfirm: Story = {
  play: async () => {
    await waitFor(() => body().getByText("Xoá nhóm"));
    await userEvent.click(body().getByText("Xoá nhóm"));
    await waitFor(() =>
      expect(
        body().getByText("Xoá nhóm là hành động không thể hoàn tác."),
      ).toBeInTheDocument(),
    );
  },
};

/** Pinned messages — pinned section with rows. */
export const GroupInfoPanel_PinnedMessages: Story = {
  args: {
    group: {
      ...GROUP,
      pinnedMessages: [
        {
          messageId: "g1-3",
          senderId: "me",
          senderName: "Nguyễn Thị Hương",
          excerpt: "Các em nộp trước tiết học ngày mai nhé!",
          sentAt: "2026-06-20T07:45:00.000Z",
        },
      ],
    },
  },
  play: async () => {
    await waitFor(() =>
      expect(
        body().getByText("Các em nộp trước tiết học ngày mai nhé!"),
      ).toBeInTheDocument(),
    );
  },
};

/** Member offline — row at reduced opacity, grayscale avatar. */
export const MemberOffline: Story = {
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("Hoàng Thị Linh")).toBeInTheDocument(),
    );
  },
};

/** Mobile viewport. */
export const Mobile_375: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  globals: { viewport: { value: "mobile1" } },
};
