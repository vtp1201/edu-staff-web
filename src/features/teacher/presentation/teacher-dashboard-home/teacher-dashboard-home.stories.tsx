import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { TeacherDashboardHomeClient } from "./teacher-dashboard-home";
import type { TeacherDashboardVM } from "./teacher-dashboard-home.i-vm";

const baseVm: TeacherDashboardVM = {
  totalStudents: 140,
  classesToday: 3,
  pendingGradesCount: 23,
  pendingApprovalCount: 4,
  newMessagesCount: 5,
  scheduleItems: [
    {
      period: 1,
      sessionKey: "morning",
      subject: "Toán học",
      className: "10A1",
      room: "P.201",
      status: "done",
    },
    {
      period: 3,
      sessionKey: "morning",
      subject: "Toán học",
      className: "11B2",
      room: "P.203",
      status: "live",
    },
    {
      period: 7,
      sessionKey: "afternoon",
      subject: "Toán học",
      className: "12C1",
      room: "P.205",
      status: "upcoming",
    },
  ],
  pendingGradeItems: [
    {
      studentName: "Nguyễn Văn An",
      initials: "VA",
      assessmentType: "KT 15 phút",
      className: "10A1",
    },
    {
      studentName: "Trần Thị Bình",
      initials: "TB",
      assessmentType: "Bài tập về nhà",
      className: "11B2",
    },
    {
      studentName: "Lê Hoàng Cường",
      initials: "HC",
      assessmentType: "KT miệng",
      className: "12C1",
    },
  ],
  notifications: [
    {
      icon: "calendar",
      colorVar: "var(--edu-primary)",
      message: "Họp hội đồng giáo viên lúc 15:00 hôm nay",
      timeAgo: "30 phút trước",
    },
    {
      icon: "users",
      colorVar: "var(--edu-warning)",
      message: "3 học sinh vắng mặt lớp 10A1",
      timeAgo: "1 giờ trước",
    },
    {
      icon: "fileText",
      colorVar: "var(--edu-success)",
      message: "Kế hoạch thi cuối kỳ đã được cập nhật",
      timeAgo: "2 giờ trước",
    },
  ],
};

const meta: Meta<typeof TeacherDashboardHomeClient> = {
  title: "Teacher/TeacherDashboardHome",
  component: TeacherDashboardHomeClient,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof TeacherDashboardHomeClient>;

export const Default: Story = {
  args: { vm: baseVm },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("140")).toBeInTheDocument();
    await expect(canvas.getByText("Lịch dạy hôm nay")).toBeInTheDocument();
    await expect(canvas.getAllByText("Nhập điểm")).toHaveLength(3);
  },
};

export const AllStats: Story = {
  args: { vm: baseVm },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Tổng học sinh")).toBeInTheDocument();
    await expect(canvas.getByText("Tiết học hôm nay")).toBeInTheDocument();
    await expect(canvas.getByText("Tin nhắn mới")).toBeInTheDocument();
  },
};

export const EmptySchedule: Story = {
  args: { vm: { ...baseVm, scheduleItems: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Không có lịch dạy hôm nay").length,
    ).toBeGreaterThan(0);
  },
};

export const Loading: Story = {
  args: {
    vm: {
      ...baseVm,
      totalStudents: null,
      scheduleItems: [],
      pendingGradeItems: [],
      notifications: [],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("—")).toBeInTheDocument();
  },
};
