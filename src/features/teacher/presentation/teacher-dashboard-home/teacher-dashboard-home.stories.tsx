import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { TeacherDashboardHomeClient } from "./teacher-dashboard-home";
import type { TeacherDashboardVM } from "./teacher-dashboard-home.i-vm";

const baseVm: TeacherDashboardVM = {
  totalStudents: 140,
  totalClasses: 4,
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
  gradesPath: "grades",
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

// AC-1, AC-2, AC-9, AC-11, AC-6, AC-7, AC-8
export const Default: Story = {
  args: { vm: baseVm },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // AC-2: total students value from BE (mock 140)
    await expect(canvas.getByText("140")).toBeInTheDocument();
    // AC-9: schedule section label
    await expect(canvas.getByText("Lịch dạy hôm nay")).toBeInTheDocument();
    // AC-11: CTA present for each pending grade item
    await expect(canvas.getAllByText("Nhập điểm")).toHaveLength(3);
    // AC-6: morning/afternoon session indicators
    await expect(canvas.getAllByText("Buổi sáng")).toHaveLength(2);
    await expect(canvas.getByText("Buổi chiều")).toBeInTheDocument();
    // AC-8: all three status badge labels present
    await expect(canvas.getByText("Hoàn thành")).toBeInTheDocument();
    await expect(canvas.getByText("Đang dạy")).toBeInTheDocument();
    await expect(canvas.getByText("Sắp tới")).toBeInTheDocument();
    // AC-7: live row has left green accent (border-edu-success class)
    const liveRow = canvasElement.querySelector("li.border-edu-success");
    await expect(liveRow).not.toBeNull();
    // AC-9: 3 schedule rows rendered
    const scheduleList = canvasElement.querySelectorAll(
      "section ul li.border-l-\\[3px\\]",
    );
    await expect(scheduleList.length).toBe(3);
  },
};

// AC-1, AC-3, AC-4, AC-5, AC-18
export const AllStats: Story = {
  args: { vm: baseVm },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // AC-1/AC-3: all 5 stat card labels present
    await expect(canvas.getByText("Tổng học sinh")).toBeInTheDocument();
    await expect(canvas.getByText("Tiết học hôm nay")).toBeInTheDocument();
    await expect(canvas.getByText("Chờ chấm điểm")).toBeInTheDocument();
    await expect(canvas.getByText("Điểm chờ duyệt")).toBeInTheDocument();
    await expect(canvas.getByText("Tin nhắn mới")).toBeInTheDocument();
    // AC-4: ADMIN_APPROVAL annotation text visible beneath the card
    await expect(canvas.getByText("Chế độ ADMIN_APPROVAL")).toBeInTheDocument();
    // AC-5: trend arrow label present (pending grades stat has trend)
    await expect(canvas.getByText("so tuần trước")).toBeInTheDocument();
  },
};

// AC-15: empty state text when no schedule items
export const EmptySchedule: Story = {
  args: { vm: { ...baseVm, scheduleItems: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Không có lịch dạy hôm nay").length,
    ).toBeGreaterThan(0);
    // Schedule section still renders (no throw)
    await expect(canvas.getByText("Lịch dạy hôm nay")).toBeInTheDocument();
  },
};

// AC-16: totalStudents null renders em dash; rest of dashboard still shows
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
    // AC-16: null totalStudents shows "—"
    await expect(canvas.getByText("—")).toBeInTheDocument();
    // Other stat cards still render with zero values
    await expect(canvas.getByText("Tổng học sinh")).toBeInTheDocument();
    await expect(canvas.getByText("Lịch dạy hôm nay")).toBeInTheDocument();
    // Empty state text for schedule and pending grades
    await expect(
      canvas.getAllByText("Không có lịch dạy hôm nay").length,
    ).toBeGreaterThan(0);
  },
};

// AC-10, AC-12: avatar initials, student names, assessment types, header badge count
export const PendingGradesDetail: Story = {
  args: { vm: baseVm },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // AC-12: header badge shows pendingGradesCount
    await expect(canvas.getByText("23")).toBeInTheDocument();
    // AC-10: avatar initials for each item
    await expect(canvas.getByText("VA")).toBeInTheDocument();
    await expect(canvas.getByText("TB")).toBeInTheDocument();
    await expect(canvas.getByText("HC")).toBeInTheDocument();
    // AC-10: student names visible
    await expect(canvas.getByText("Nguyễn Văn An")).toBeInTheDocument();
    await expect(canvas.getByText("Trần Thị Bình")).toBeInTheDocument();
    await expect(canvas.getByText("Lê Hoàng Cường")).toBeInTheDocument();
    // AC-11: CTA links have accessible aria-label
    const ctaLinks = canvasElement.querySelectorAll(
      "a[aria-label*='Nhập điểm']",
    );
    await expect(ctaLinks.length).toBe(3);
  },
};

// US-E17.1 AC-08/AC-13/AC-14: at 375px the stat grid uses the auto-fit
// minmax(200px) column class (1 column on mobile) with a 16px gap-4 gap.
const VIEWPORT_375 = {
  viewports: {
    mobile375: {
      name: "Mobile 375",
      styles: { width: "375px", height: "812px" },
      type: "mobile" as const,
    },
  },
  defaultViewport: "mobile375",
};

export const Viewport375: Story = {
  args: { vm: baseVm },
  parameters: { viewport: VIEWPORT_375 },
  play: async ({ canvasElement }) => {
    const grid = canvasElement.querySelector<HTMLElement>(
      '[class*="auto-fit"]',
    );
    await expect(grid).not.toBeNull();
    await expect(grid?.className).toContain(
      "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]",
    );
    await expect(grid?.className).toContain("gap-4");
  },
};

// AC-13, AC-14: notifications with icon boxes, content text, timestamps
export const NotificationsDetail: Story = {
  args: { vm: baseVm },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // AC-13: section title
    await expect(canvas.getByText("Thông báo")).toBeInTheDocument();
    // AC-13/AC-14: notification content text
    await expect(
      canvas.getByText("Họp hội đồng giáo viên lúc 15:00 hôm nay"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("3 học sinh vắng mặt lớp 10A1"),
    ).toBeInTheDocument();
    // AC-13: relative timestamps present
    await expect(canvas.getByText("30 phút trước")).toBeInTheDocument();
    await expect(canvas.getByText("1 giờ trước")).toBeInTheDocument();
  },
};
