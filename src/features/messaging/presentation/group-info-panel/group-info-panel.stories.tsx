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
};

// US-E18.51 — the pin board is its own prop, fetched independently of GROUP.
const PINNED = [
  {
    messageId: "g1-3",
    senderId: "me",
    senderName: "Nguyễn Thị Hương",
    excerpt: "Các em nộp trước tiết học ngày mai nhé!",
    sentAt: "2026-06-20T07:45:00.000Z",
    pinnedAt: "2026-06-20T08:00:00.000Z",
    pinnedBy: "me",
  },
];

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
    pinnedMessages: [],
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

/** Pinned messages — pinned section with rows (US-E18.51: own prop). */
export const GroupInfoPanel_PinnedMessages: Story = {
  args: { pinnedMessages: PINNED },
  play: async () => {
    await waitFor(() =>
      expect(
        body().getByText("Các em nộp trước tiết học ngày mai nhé!"),
      ).toBeInTheDocument(),
    );
  },
};

/** US-E18.51 — pin board still loading while group detail is already rendered. */
export const GroupInfoPanel_PinnedLoading: Story = {
  args: { pinnedMessages: [], pinnedLoading: true },
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("THÀNH VIÊN")).toBeInTheDocument(),
    );
    await expect(body().getByRole("status")).toHaveTextContent(
      "Đang tải tin nhắn đã ghim",
    );
    await expect(
      body().queryByText("Chưa có tin nhắn được ghim."),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.51 — the pin board read failed (e.g. the 429 shared with message
 * history). Group detail stays usable; only the pinned section degrades.
 */
export const GroupInfoPanel_PinnedError: Story = {
  args: { pinnedMessages: [], pinnedError: "load-pinned-failed" },
  play: async () => {
    await waitFor(() =>
      expect(
        body().getByText(
          "Không thể tải danh sách tin nhắn đã ghim. Vui lòng thử lại.",
        ),
      ).toBeInTheDocument(),
    );
    await expect(body().getByText("THÀNH VIÊN")).toBeInTheDocument();
  },
};

/** US-E18.51 — unpin control fires onUnpin with the message id. */
export const GroupInfoPanel_Unpin: Story = {
  args: { pinnedMessages: PINNED, canUnpin: true, onUnpin: fn() },
  play: async ({ args }) => {
    const unpin = await body().findByRole("button", {
      name: "Bỏ ghim tin nhắn của Nguyễn Thị Hương",
    });
    const rect = unpin.getBoundingClientRect();
    await expect(rect.height).toBeGreaterThanOrEqual(44);
    await userEvent.click(unpin);
    await expect(args.onUnpin).toHaveBeenCalledWith("g1-3");
  },
};

/**
 * US-E18.51 — a member KNOWN not to hold the pin capability sees no unpin
 * control (only an explicit `false` hides it; `undefined` = unknown = shown).
 */
export const GroupInfoPanel_UnpinHiddenForNonModerator: Story = {
  args: {
    pinnedMessages: PINNED,
    canUnpin: false,
    onUnpin: fn(),
    selfIsAdmin: false,
  },
  play: async () => {
    await waitFor(() =>
      expect(
        body().getByText("Các em nộp trước tiết học ngày mai nhé!"),
      ).toBeInTheDocument(),
    );
    await expect(
      body().queryByRole("button", {
        name: "Bỏ ghim tin nhắn của Nguyễn Thị Hương",
      }),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.58 — the pin board resolves the sender server-side, so a real name
 * renders verbatim (no i18n fallback, no mapper-minted placeholder).
 */
export const GroupInfoPanel_PinnedResolvedSender: Story = {
  // A sender who is NOT in the member list, so the assertion below can only
  // match the pinned row (member rows render names too).
  args: { pinnedMessages: [{ ...PINNED[0], senderName: "Cô Lan Anh" }] },
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("Cô Lan Anh")).toBeInTheDocument(),
    );
    await expect(
      body().queryByText("Không rõ người gửi"),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.51/US-E18.58 — sender not resolvable (BE's `"Member"` sentinel, or a
 * defensive blank) is normalised to `undefined` by the mapper → the localized
 * fallback renders, never blank and never the English word "Member".
 */
export const GroupInfoPanel_PinnedUnknownSender: Story = {
  args: {
    pinnedMessages: [{ ...PINNED[0], senderName: undefined }],
  },
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("Không rõ người gửi")).toBeInTheDocument(),
    );
    await expect(body().queryByText("Member")).not.toBeInTheDocument();
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
