import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
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
