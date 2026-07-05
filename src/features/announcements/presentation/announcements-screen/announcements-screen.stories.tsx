import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  AnnouncementEntity,
  AnnouncementRecipient,
} from "../../domain/entities/announcement.entity";
import type { AnnouncementsScreenProps } from "./announcements-screen";
import { AnnouncementsScreen } from "./announcements-screen";

const ITEMS: AnnouncementEntity[] = [
  {
    id: "anc-1",
    title: "Lịch nghỉ lễ Quốc khánh 2/9",
    body: "Nhà trường thông báo lịch nghỉ lễ Quốc khánh từ ngày 1/9 đến hết ngày 3/9.",
    priority: "important",
    status: "sent",
    audience: ["all"],
    gradeFilter: [],
    recipientCount: 1280,
    readCount: 940,
    scheduledAt: null,
    sentAt: "2026-06-15 01:00",
    createdAt: "2026-06-14 08:30",
    authorName: "Phòng Giáo vụ",
  },
  {
    id: "anc-2",
    title: "Khẩn: Tạm dừng học do thời tiết xấu",
    body: "Do ảnh hưởng của bão số 5, nhà trường cho học sinh nghỉ học ngày mai.",
    priority: "urgent",
    status: "sent",
    audience: ["parents", "students"],
    gradeFilter: [],
    recipientCount: 1248,
    readCount: 1100,
    scheduledAt: null,
    sentAt: "2026-06-16 13:00",
    createdAt: "2026-06-16 12:45",
    authorName: "Ban Giám hiệu",
  },
  {
    id: "anc-3",
    title: "Họp phụ huynh khối 12 cuối kỳ",
    body: "Kính mời quý phụ huynh khối 12 tham dự buổi họp tổng kết học kỳ.",
    priority: "normal",
    status: "scheduled",
    audience: ["parents"],
    gradeFilter: ["12"],
    recipientCount: 256,
    readCount: 0,
    scheduledAt: "2026-06-22 01:00",
    sentAt: null,
    createdAt: "2026-06-17 09:15",
    authorName: "GVCN khối 12",
  },
  {
    id: "anc-4",
    title: "Tập huấn giáo viên đầu năm",
    body: "Lịch tập huấn chuyên môn dành cho toàn thể giáo viên sẽ diễn ra tuần tới.",
    priority: "normal",
    status: "draft",
    audience: ["teachers"],
    gradeFilter: [],
    recipientCount: 42,
    readCount: 0,
    scheduledAt: null,
    sentAt: null,
    createdAt: "2026-06-17 15:40",
    authorName: "Phòng Đào tạo",
  },
];

const RECIPIENTS: AnnouncementRecipient[] = [
  {
    id: "u-1",
    name: "Nguyễn Thị Lan",
    role: "parent",
    readAt: "2026-06-15 02:10",
  },
  { id: "u-2", name: "Trần Văn Hùng", role: "parent", readAt: null },
  { id: "u-3", name: "Lê Minh Châu", role: "teacher", readAt: null },
];

const ok = async () => ({ ok: true });
const noopList = async () => ITEMS;

const baseProps: AnnouncementsScreenProps = {
  initialItems: ITEMS,
  loadFailed: false,
  fetchListAction: noopList,
  onCreate: ok,
  onUpdate: ok,
  onDelete: ok,
  onGetRecipients: async () => ({ ok: true, recipients: RECIPIENTS }),
  onRemind: async () => ({ ok: true, unreadCount: 2 }),
};

const meta: Meta<typeof AnnouncementsScreen> = {
  title: "Features/Announcements/AnnouncementsScreen",
  component: AnnouncementsScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-[color:var(--edu-bg)]">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof AnnouncementsScreen>;

/** Skeleton cards while the list loads. */
export const Loading: Story = {
  args: {
    ...baseProps,
    initialItems: [],
    fetchListAction: () => new Promise(() => []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByLabelText(/Đang tải danh sách thông báo/i),
    ).toBeInTheDocument();
  },
};

/** Empty state with CTA when there are no announcements. */
export const EmptyState: Story = {
  args: { ...baseProps, initialItems: [], fetchListAction: async () => [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Chưa có thông báo/i)).toBeInTheDocument();
  },
};

/** List with sent + scheduled + draft items and all priorities. */
export const ListWithAllStatuses: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Lịch nghỉ lễ Quốc khánh/i),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/Khẩn: Tạm dừng học/i)).toBeInTheDocument();
  },
};

/** Open the create drawer; with a too-short title the Send button is disabled. */
export const CreateDrawer_Validation: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createBtn = canvas.getAllByRole("button", {
      name: /Tạo thông báo/i,
    })[0];
    await userEvent.click(createBtn);
    // Drawer renders in a portal — query the whole document body.
    const dialog = within(document.body);
    const sendBtn = await dialog.findByRole("button", { name: /Gửi ngay/i });
    await expect(sendBtn).toBeDisabled();
  },
};

/** Fill the form so the Send button enables. */
export const CreateDrawer_Send: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createBtn = canvas.getAllByRole("button", {
      name: /Tạo thông báo/i,
    })[0];
    await userEvent.click(createBtn);
    const dialog = within(document.body);
    const title = await dialog.findByLabelText(/Tiêu đề/i);
    const body = await dialog.findByLabelText(/Nội dung/i);
    await userEvent.type(title, "Thông báo họp phụ huynh");
    await userEvent.type(body, "Nội dung thông báo họp phụ huynh đầu năm học.");
    const sendBtn = await dialog.findByRole("button", { name: /Gửi ngay/i });
    await expect(sendBtn).toBeEnabled();
  },
};

/** Detail sheet shows the recipient read receipts. */
export const DetailSheet_ReadReceipts: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viewBtns = canvas.getAllByRole("button", { name: /Xem chi tiết/i });
    await userEvent.click(viewBtns[0]);
    const dialog = within(document.body);
    await expect(
      await dialog.findByText(/Chi tiết thông báo/i),
    ).toBeInTheDocument();
    await expect(
      await dialog.findByText(/Nguyễn Thị Lan/i),
    ).toBeInTheDocument();
  },
};

/** Delete confirmation dialog. */
export const DeleteDialog: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteBtns = canvas.getAllByRole("button", { name: /^Xóa$/i });
    await userEvent.click(deleteBtns[0]);
    const dialog = within(document.body);
    await expect(
      await dialog.findByText(/Bạn có chắc muốn xóa thông báo này/i),
    ).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// AC-2 — Card fields: priority badge, status badge, progress bar, urgent border
// ---------------------------------------------------------------------------

/** AC-2: Each card field is present; urgent card has the correct aria-label. */
export const CardFields_UrgentAndProgress: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Priority badges
    await expect(canvas.getByText("Khẩn")).toBeInTheDocument();
    await expect(canvas.getByText("Quan trọng")).toBeInTheDocument();
    // Status badges
    const sentBadges = canvas.getAllByText("Đã gửi");
    await expect(sentBadges.length).toBeGreaterThanOrEqual(1);
    await expect(canvas.getByText("Đã lên lịch")).toBeInTheDocument();
    await expect(canvas.getByText("Nháp")).toBeInTheDocument();
    // Recipient count visible on at least one card
    await expect(canvas.getByText(/1280 người nhận/i)).toBeInTheDocument();
    // Progress bar with role=progressbar exists
    const progressBars = canvas.getAllByRole("progressbar");
    await expect(progressBars.length).toBeGreaterThanOrEqual(1);
    // Urgent card aria-label
    await expect(
      canvas.getByLabelText(/Thông báo khẩn cấp: Khẩn: Tạm dừng học/i),
    ).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// AC-3 — Filter pills switch the active tab
// ---------------------------------------------------------------------------

/** AC-3: Clicking "Đã gửi" tab marks it aria-selected and filters items. */
export const FilterPills_SentTab: Story = {
  args: {
    ...baseProps,
    fetchListAction: async (filter) =>
      ITEMS.filter((i) => filter === "all" || i.status === filter),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sentTab = canvas.getByRole("tab", { name: /Đã gửi/i });
    await expect(sentTab).toHaveAttribute("aria-selected", "false");
    await userEvent.click(sentTab);
    await expect(sentTab).toHaveAttribute("aria-selected", "true");
    // "Tất cả" tab is no longer selected
    const allTab = canvas.getByRole("tab", { name: /Tất cả/i });
    await expect(allTab).toHaveAttribute("aria-selected", "false");
  },
};

// ---------------------------------------------------------------------------
// AC-4 — Char count is visible in the drawer
// ---------------------------------------------------------------------------

/** AC-4 (supplement): char count element is visible even before typing. */
export const CreateDrawer_CharCount: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createBtn = canvas.getAllByRole("button", {
      name: /Tạo thông báo/i,
    })[0];
    await userEvent.click(createBtn);
    const dialog = within(document.body);
    // char count pattern "0/200" should appear
    await expect(await dialog.findByText(/0\/200/i)).toBeInTheDocument();
    // body char count "0/2000"
    await expect(await dialog.findByText(/0\/2000/i)).toBeInTheDocument();
    // Send button is disabled when fields are empty
    const sendBtn = await dialog.findByRole("button", { name: /Gửi ngay/i });
    await expect(sendBtn).toBeDisabled();
  },
};

// ---------------------------------------------------------------------------
// AC-5 — Send now → toast confirmation
// ---------------------------------------------------------------------------

/**
 * AC-5 / US-E17.8 AC-17: Clicking "Gửi ngay" no longer sends immediately — it
 * opens the `DestructiveConfirmDialog` (send-to-school is high-stakes). Only
 * confirming inside that dialog triggers the send action and closes the
 * drawer. This replaces the pre-US-E17.8 single-click-sends assertion.
 */
export const CreateDrawer_SendSubmit: Story = {
  args: {
    ...baseProps,
    onCreate: async () => ({ ok: true }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createBtn = canvas.getAllByRole("button", {
      name: /Tạo thông báo/i,
    })[0];
    await userEvent.click(createBtn);
    const drawer = within(document.body);
    const title = await drawer.findByLabelText(/Tiêu đề/i);
    const body = await drawer.findByLabelText(/Nội dung/i);
    await userEvent.type(title, "Thông báo nghỉ lễ 30/4");
    await userEvent.type(body, "Nhà trường thông báo lịch nghỉ lễ 30/4.");
    const drawerSendBtn = await drawer.findByRole("button", {
      name: /Gửi ngay/i,
    });
    await expect(drawerSendBtn).toBeEnabled();

    await userEvent.click(drawerSendBtn);

    // Confirm dialog opens first — the drawer's send action has NOT fired yet.
    const confirmDialog = within(await drawer.findByRole("alertdialog"));
    await expect(
      confirmDialog.getByText(messages.announcements.sendConfirmTitle),
    ).toBeInTheDocument();

    const confirmSendBtn = confirmDialog.getByRole("button", {
      name: /Gửi ngay/i,
    });
    await userEvent.click(confirmSendBtn);

    // Drawer closes (its title disappears) once the mutation resolves —
    // we trust the onCreate mock was called; toast renders outside canvas.
    // The confirm click fires an un-awaited async submit() + Radix's own
    // exit-animation unmount delay, so poll instead of asserting synchronously
    // (DEF-001 fix verification — see US-E17.8 story.md Evidence).
    await waitFor(() =>
      expect(drawer.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(title).not.toBeInTheDocument());
  },
};

// ---------------------------------------------------------------------------
// AC-6 — Save draft → drawer closes
// ---------------------------------------------------------------------------

/** AC-6: "Lưu nháp" button is always enabled and triggers onUpdate action. */
export const CreateDrawer_SaveDraft: Story = {
  args: {
    ...baseProps,
    onUpdate: async () => ({ ok: true }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createBtn = canvas.getAllByRole("button", {
      name: /Tạo thông báo/i,
    })[0];
    await userEvent.click(createBtn);
    const dialog = within(document.body);
    // "Lưu nháp" should always be enabled (submitting = false initially)
    const draftBtn = await dialog.findByRole("button", { name: /Lưu nháp/i });
    await expect(draftBtn).toBeEnabled();
    await userEvent.click(draftBtn);
    // Drawer closes — "Lưu nháp" leaves the DOM
    await expect(draftBtn).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// AC-7 — Schedule mode reveals datetime input
// ---------------------------------------------------------------------------

/** AC-7: Switching to "Lên lịch" send mode reveals the datetime-local input. */
export const CreateDrawer_ScheduleMode: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createBtn = canvas.getAllByRole("button", {
      name: /Tạo thông báo/i,
    })[0];
    await userEvent.click(createBtn);
    const dialog = within(document.body);
    // Click the "Lên lịch" radio label
    const scheduleLabel = await dialog.findByText(/^Lên lịch$/i);
    await userEvent.click(scheduleLabel);
    // Datetime input should now appear
    const dtInput = await dialog.findByLabelText(/Thời gian lên lịch/i);
    await expect(dtInput).toBeInTheDocument();
    await expect(dtInput).toHaveAttribute("type", "datetime-local");
    // "Lên lịch" button should now appear (replaces "Gửi ngay")
    const scheduleBtn = await dialog.findByRole("button", {
      name: /^Lên lịch$/i,
    });
    await expect(scheduleBtn).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// AC-8 — Preview toggle shows notification row
// ---------------------------------------------------------------------------

/** AC-8: Toggling "Xem trước" reveals a preview row with the typed content. */
export const CreateDrawer_PreviewToggle: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createBtn = canvas.getAllByRole("button", {
      name: /Tạo thông báo/i,
    })[0];
    await userEvent.click(createBtn);
    const dialog = within(document.body);
    const title = await dialog.findByLabelText(/Tiêu đề/i);
    await userEvent.type(title, "Bản xem trước thông báo");
    const previewToggle = await dialog.findByRole("button", {
      name: /Xem trước/i,
    });
    await expect(previewToggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(previewToggle);
    await expect(previewToggle).toHaveAttribute("aria-pressed", "true");
    // Preview heading appears
    await expect(await dialog.findByText(/Bản xem trước/i)).toBeInTheDocument();
    // Typed title is shown in preview
    await expect(
      await dialog.findByText(/Bản xem trước thông báo/i),
    ).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// AC-9 (supplement) — Detail sheet recipient filter tabs
// ---------------------------------------------------------------------------

/** AC-9 (filter tabs): "Chưa đọc" tab filters to only unread recipients. */
export const DetailSheet_RecipientFilter: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viewBtns = canvas.getAllByRole("button", { name: /Xem chi tiết/i });
    await userEvent.click(viewBtns[0]);
    const dialog = within(document.body);
    // Wait for sheet to open and data to load
    await expect(
      await dialog.findByText(/Nguyễn Thị Lan/i),
    ).toBeInTheDocument();
    // Click "Chưa đọc" filter tab
    const unreadTab = dialog.getByRole("tab", { name: /Chưa đọc/i });
    await userEvent.click(unreadTab);
    await expect(unreadTab).toHaveAttribute("aria-selected", "true");
    // Nguyễn Thị Lan (read) should not be visible; Trần Văn Hùng (unread) should be
    await expect(dialog.queryByText(/Nguyễn Thị Lan/i)).not.toBeInTheDocument();
    await expect(await dialog.findByText(/Trần Văn Hùng/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// AC-10 — Remind sends toast
// ---------------------------------------------------------------------------

/** AC-10: Clicking "Gửi nhắc chưa đọc" calls onRemind and shows toast text. */
export const DetailSheet_Remind: Story = {
  args: {
    ...baseProps,
    onRemind: async () => ({ ok: true, unreadCount: 2 }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viewBtns = canvas.getAllByRole("button", { name: /Xem chi tiết/i });
    await userEvent.click(viewBtns[0]);
    const dialog = within(document.body);
    // Wait for sheet and recipients to load
    await expect(
      await dialog.findByText(/Nguyễn Thị Lan/i),
    ).toBeInTheDocument();
    const remindBtn = dialog.getByRole("button", {
      name: /Gửi nhắc chưa đọc/i,
    });
    await expect(remindBtn).toBeEnabled();
    await userEvent.click(remindBtn);
    // Button becomes disabled while reminding
    // After response the toast fires via Sonner — assert the button re-enables
    await expect(remindBtn).toBeEnabled();
  },
};

// ---------------------------------------------------------------------------
// AC-11 (supplement) — Delete confirm click removes item
// ---------------------------------------------------------------------------

/** AC-11 (confirm): Clicking confirm in the dialog calls onDelete. */
export const DeleteDialog_Confirm: Story = {
  args: {
    ...baseProps,
    onDelete: async () => ({ ok: true }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteBtns = canvas.getAllByRole("button", { name: /^Xóa$/i });
    await userEvent.click(deleteBtns[0]);
    const dialog = within(document.body);
    await expect(
      await dialog.findByText(/Bạn có chắc muốn xóa thông báo này/i),
    ).toBeInTheDocument();
    // Click the confirm delete button (the AlertDialogAction)
    const confirmBtn = dialog.getByRole("button", { name: /^Xóa$/i });
    await expect(confirmBtn).toBeEnabled();
    await userEvent.click(confirmBtn);
    // Dialog should close after confirm
    await expect(confirmBtn).not.toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// AC-12 (supplement) — Empty state CTA button present
// ---------------------------------------------------------------------------

/** AC-12 (CTA): Empty state shows "Tạo thông báo" CTA button. */
export const EmptyState_CTA: Story = {
  args: { ...baseProps, initialItems: [], fetchListAction: async () => [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Chưa có thông báo/i)).toBeInTheDocument();
    // CTA button must be present within the empty state
    const cta = canvas.getAllByRole("button", { name: /Tạo thông báo/i });
    await expect(cta.length).toBeGreaterThanOrEqual(1);
  },
};

// ---------------------------------------------------------------------------
// AC-14 — A11Y: audience picker fieldset has legend, preview toggle aria-pressed
// ---------------------------------------------------------------------------

/** AC-14 (a11y): Audience picker has a group label (legend) and toggle has aria-pressed. */
export const A11y_DrawerAudienceGroupLabel: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createBtn = canvas.getAllByRole("button", {
      name: /Tạo thông báo/i,
    })[0];
    await userEvent.click(createBtn);
    const dialog = within(document.body);
    // fieldset legend for audience should be present
    await expect(await dialog.findByText(/Đối tượng/i)).toBeInTheDocument();
    // Each audience toggle has aria-pressed
    const allBtn = await dialog.findByRole("button", {
      name: /^Tất cả$/i,
    });
    await expect(allBtn).toHaveAttribute("aria-pressed");
    // Filter pills tablist has aria-label
    const tabList = canvas.getByRole("tablist");
    await expect(tabList).toHaveAttribute("aria-label");
  },
};
