import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { CoursesSkeleton } from "./courses-skeleton";
import { StudentCoursesScreen } from "./student-courses-screen";
import type { CourseCardVm } from "./student-courses-screen.i-vm";

const MOCK_COURSES: CourseCardVm[] = [
  {
    id: "1",
    name: "Toán học",
    teacherName: "Nguyễn Thị Hương",
    tone: "primary",
    lessonsDone: 2,
    lessonsTotal: 4,
    progressPct: 50,
    gradeAvg: 8.5,
    status: "in-progress",
    href: "/vi/t/demo/student/courses/1",
  },
  {
    id: "2",
    name: "Vật Lý",
    teacherName: "Trần Văn Minh",
    tone: "success",
    lessonsDone: 14,
    lessonsTotal: 22,
    progressPct: 64,
    gradeAvg: 9.0,
    status: "in-progress",
    href: "/vi/t/demo/student/courses/2",
  },
  {
    id: "3",
    name: "Ngữ Văn",
    teacherName: "Phạm Quốc Bảo",
    tone: "purple",
    lessonsDone: 24,
    lessonsTotal: 24,
    progressPct: 100,
    gradeAvg: 8.0,
    status: "completed",
    href: "/vi/t/demo/student/courses/3",
  },
  {
    id: "4",
    name: "Lịch Sử",
    teacherName: "Hoàng Văn Nam",
    tone: "error",
    lessonsDone: 0,
    lessonsTotal: 24,
    progressPct: 0,
    gradeAvg: 7.2,
    status: "not-started",
    href: "/vi/t/demo/student/courses/4",
  },
];

const meta: Meta<typeof StudentCoursesScreen> = {
  title: "Features/LMS/StudentCourses",
  component: StudentCoursesScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-edu-bg p-6">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof StudentCoursesScreen>;

export const CoursesGrid_Loading: Story = {
  render: () => <CoursesSkeleton />,
};

export const CoursesGrid_AllTab: Story = {
  args: { courses: MOCK_COURSES, errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Toán học")).toBeInTheDocument();
    await expect(canvas.getByText("Lịch Sử")).toBeInTheDocument();
    // "Tiếp tục học" for started courses, "Bắt đầu" for the not-started one.
    await expect(canvas.getAllByText("Tiếp tục học").length).toBeGreaterThan(0);
    await expect(canvas.getByText("Bắt đầu")).toBeInTheDocument();
  },
};

export const CoursesGrid_InProgressTab: Story = {
  args: { courses: MOCK_COURSES, errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tab = canvas.getByRole("tab", { name: /Đang học/ });
    await userEvent.click(tab);
    await expect(tab).toHaveAttribute("aria-selected", "true");
    // In-progress courses shown, the completed one hidden.
    await expect(canvas.getByText("Toán học")).toBeInTheDocument();
    await expect(canvas.queryByText("Ngữ Văn")).not.toBeInTheDocument();
  },
};

export const CoursesGrid_Empty: Story = {
  args: { courses: [], errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Bạn chưa ghi danh khoá học nào."),
    ).toBeInTheDocument();
  },
};
