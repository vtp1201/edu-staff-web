import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { StaffLeaveRequestEntity } from "@/features/staff-leave/domain/entities/staff-leave-request.entity";
import type { StaffLeaveScreenProps } from "./staff-leave-screen";
import { StaffLeaveScreen } from "./staff-leave-screen";

/** Story fixtures — UI data, not i18n copy. Mirrors the mock repository seed. */
const REQUESTS: StaffLeaveRequestEntity[] = [
  {
    id: "sl-001",
    staffId: "u-001",
    staffName: "Nguyễn Thị Hương",
    initials: "NH",
    avatarTone: "var(--edu-primary)",
    staffRole: "teacher",
    department: "Tổ Toán",
    leaveType: "sick",
    startDate: "03/05/2026",
    endDate: "03/05/2026",
    days: 1,
    reason:
      "Khám sức khoẻ định kỳ tại BV Bạch Mai theo lịch hẹn từ tuần trước.",
    status: "pending",
    submittedAt: "29/04/2026 09:10",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  },
  {
    id: "sl-002",
    staffId: "u-002",
    staffName: "Đỗ Thị Mai",
    initials: "DM",
    avatarTone: "var(--edu-warning)",
    staffRole: "teacher",
    department: "Tổ Ngoại Ngữ",
    leaveType: "sick",
    startDate: "29/04/2026",
    endDate: "30/04/2026",
    days: 2,
    reason: "Bị cảm sốt từ tối qua, có giấy chứng nhận của phòng khám tư.",
    status: "pending",
    submittedAt: "29/04/2026 07:00",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  },
  {
    id: "sl-003",
    staffId: "u-003",
    staffName: "Hoàng Văn Trí",
    initials: "HT",
    avatarTone: "var(--edu-teal)",
    staffRole: "staff",
    department: "Bộ phận Bảo vệ",
    leaveType: "family",
    startDate: "05/05/2026",
    endDate: "06/05/2026",
    days: 2,
    reason: "Đám cưới em ruột tại quê. Đã sắp xếp người trực thay ca bảo vệ.",
    status: "pending",
    submittedAt: "24/04/2026 18:45",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  },
  {
    id: "sl-004",
    staffId: "u-004",
    staffName: "Trần Văn Minh",
    initials: "TM",
    avatarTone: "var(--edu-purple)",
    staffRole: "teacher",
    department: "Tổ Lý-Hoá",
    leaveType: "annual",
    startDate: "12/05/2026",
    endDate: "14/05/2026",
    days: 3,
    reason: "Tham dự hội thảo chuyên môn Vật Lý cấp tỉnh tại TP.HCM.",
    status: "approved",
    submittedAt: "20/04/2026 14:00",
    approvedBy: "Trần Minh Quân (BGH)",
    approvedAt: "21/04/2026 09:30",
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  },
  {
    id: "sl-007",
    staffId: "u-007",
    staffName: "Phạm Quốc Bảo",
    initials: "PB",
    avatarTone: "var(--edu-teal)",
    staffRole: "teacher",
    department: "Tổ Văn-Sử",
    leaveType: "annual",
    startDate: "02/05/2026",
    endDate: "04/05/2026",
    days: 3,
    reason: "Nghỉ phép năm theo lịch — đi du lịch cùng gia đình.",
    status: "rejected",
    submittedAt: "26/04/2026 11:00",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: "Trần Minh Quân (BGH)",
    rejectedAt: "27/04/2026 10:00",
    rejectionReason: "Trùng lịch hội nghị giáo viên toàn trường (03/05).",
  },
];

const okApprove = async () => ({ ok: true as const });
const okReject = async () => ({ ok: true as const });

const baseArgs: StaffLeaveScreenProps = {
  initialRequests: REQUESTS,
  onApprove: okApprove,
  onReject: okReject,
};

const meta: Meta<typeof StaffLeaveScreen> = {
  title: "Features/StaffLeave/StaffLeaveScreen",
  component: StaffLeaveScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof StaffLeaveScreen>;

/** AC-1 — loading skeleton while the RSC streams initial data. */
export const Loading: Story = {
  args: { ...baseArgs, initialLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Quản lý nghỉ phép nhân sự" }),
    ).toBeInTheDocument();
  },
};

/** AC-6 — empty state when there are no requests. */
export const EmptyState: Story = {
  args: { ...baseArgs, initialRequests: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có đơn xin nghỉ nào."),
    ).toBeInTheDocument();
  },
};

/** AC-2 — full list renders with names + status badges. */
export const AllRequests: Story = {
  args: baseArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nguyễn Thị Hương")).toBeInTheDocument();
    await expect(canvas.getByText("Trần Văn Minh")).toBeInTheDocument();
    await expect(canvas.getByText("Phạm Quốc Bảo")).toBeInTheDocument();
  },
};

/** AC-3 — clicking the "Chờ duyệt" pill filters to pending requests only. */
export const FilteredPending: Story = {
  args: baseArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Chờ duyệt/ }));
    await waitFor(async () => {
      await expect(canvas.getByText("Nguyễn Thị Hương")).toBeInTheDocument();
      await expect(canvas.queryByText("Trần Văn Minh")).not.toBeInTheDocument();
    });
  },
};

/** AC-4 — approve sl-001; its status badge flips to "Đã duyệt". */
export const ApproveFlow: Story = {
  args: baseArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const approveBtn = canvas.getByRole("button", {
      name: /Phê duyệt — Nguyễn Thị Hương/,
    });
    await userEvent.click(approveBtn);
    await waitFor(async () => {
      await expect(
        canvas.getByText("Đã phê duyệt đơn nghỉ phép."),
      ).toBeInTheDocument();
    });
  },
};

/** AC-5 — reject sl-002 with a valid reason; toast confirms. */
export const RejectFlow: Story = {
  args: baseArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rejectBtn = canvas.getByRole("button", {
      name: /Từ chối — Đỗ Thị Mai/,
    });
    await userEvent.click(rejectBtn);
    const textarea = await canvas.findByRole("textbox");
    await userEvent.type(textarea, "Đơn nộp chưa đầy đủ giấy tờ.");
    await userEvent.click(
      canvas.getByRole("button", { name: "Xác nhận từ chối" }),
    );
    await waitFor(async () => {
      await expect(
        canvas.getByText("Đã từ chối đơn nghỉ phép."),
      ).toBeInTheDocument();
    });
  },
};

/** AC-7 — error banner with a retry button when the load failed. */
export const ErrorState: Story = {
  args: { ...baseArgs, initialRequests: [], loadFailed: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không thể tải danh sách đơn nghỉ phép."),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};
