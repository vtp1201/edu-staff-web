import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
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

/**
 * AC-E17.9-19/20 / FR-007 (US-E17.9): back button's aria-label matches the
 * resolved `messaging.chat.backToList` value, meets the 44x44 touch target,
 * and clicking it calls `onOpenChange(false)` exactly once.
 */
export const GroupInfoPanel_BackButton: Story = {
  args: { onOpenChange: fn() },
  play: async ({ args }) => {
    const back = await body().findByRole("button", {
      name: "Quay lại danh sách",
    });
    await expect(back).toHaveAttribute("aria-label", "Quay lại danh sách");
    const rect = back.getBoundingClientRect();
    await expect(rect.height).toBeGreaterThanOrEqual(44);
    await expect(rect.width).toBeGreaterThanOrEqual(44);
    await userEvent.click(back);
    await expect(args.onOpenChange).toHaveBeenCalledTimes(1);
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
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

// ── US-E10.6 presence (FR-004) ──────────────────────────────────────────────

const MIXED_PRESENCE: GroupEntity = {
  ...GROUP,
  members: [
    // Deliberately pre-shuffled so the online-first sort is observable.
    {
      userId: "u-c1",
      name: "Lê Thị Cẩm",
      initials: "LC",
      color: "purple",
      role: "member",
      isOnline: false,
      presence: "offline",
    },
    {
      userId: "u-l1",
      name: "Hoàng Thị Linh",
      initials: "HL",
      color: "error",
      role: "member",
      isOnline: false,
      presence: "recent",
      lastActiveAt: "2026-07-14T09:57:00.000Z",
    },
    {
      userId: "me",
      name: "Nguyễn Thị Hương",
      initials: "NH",
      color: "primary",
      role: "admin",
      isOnline: true,
      presence: "online",
    },
    {
      userId: "u-b1",
      name: "Trần Văn Bình",
      initials: "TB",
      color: "teal",
      role: "member",
      isOnline: true,
      presence: "online",
    },
  ],
};

/**
 * AC-10.6.4.1/.2/.3 — dot per row, online-first stable sort, and a count banner
 * that includes recent members (2 online + 1 recent = "3 đang hoạt động").
 */
export const PresenceMixedSortAndCount: Story = {
  args: { group: MIXED_PRESENCE },
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("3 đang hoạt động")).toBeInTheDocument(),
    );
    // Online + recent members carry a dot; offline does not → 3 dots.
    await waitFor(() =>
      expect(document.body.querySelectorAll("[data-presence]").length).toBe(3),
    );
    // Sort: an online member DOM-precedes the offline member.
    const online = body().getByText("Trần Văn Bình");
    const offline = body().getByText("Lê Thị Cẩm");
    await expect(
      online.compareDocumentPosition(offline) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};

/** AC-10.6.4.8 — single-member group: count reflects that one member. */
export const PresenceSingleMember: Story = {
  args: {
    group: {
      ...GROUP,
      members: [
        {
          userId: "me",
          name: "Nguyễn Thị Hương",
          initials: "NH",
          color: "primary",
          role: "admin",
          isOnline: true,
          presence: "online",
        },
      ],
    },
  },
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("1 đang hoạt động")).toBeInTheDocument(),
    );
  },
};

/**
 * AC-10.6.4.5/.9 — presence unavailable (fetch failed / no records merged):
 * every row falls back to offline-equivalent, count 0, no dots, no error UI.
 */
export const PresenceUnavailable: Story = {
  args: {
    group: {
      ...GROUP,
      members: GROUP.members.map((m) => ({
        ...m,
        isOnline: false,
        presence: "offline" as const,
      })),
    },
  },
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("0 đang hoạt động")).toBeInTheDocument(),
    );
    await expect(document.body.querySelector("[data-presence]")).toBeNull();
  },
};
