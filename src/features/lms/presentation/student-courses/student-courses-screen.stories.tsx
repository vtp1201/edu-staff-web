import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { CoursesSkeleton } from "./courses-skeleton";
import { StudentCoursesScreen } from "./student-courses-screen";
import type { CourseCardVm } from "./student-courses-screen.i-vm";

/** Shaped from the REAL `CourseSummary` — title + publish status, nothing else
 *  (no progress/grade: the contract carries neither). */
const MOCK_COURSES: CourseCardVm[] = [
  {
    id: "co-toan-10",
    title: "Toán 10 — Đại số & Giải tích",
    status: "PUBLISHED",
    isDefault: true,
    tone: "primary",
    href: "/vi/t/demo/student/courses/co-toan-10",
  },
  {
    id: "co-ly-10",
    title: "Vật lý 10 — Điện từ trường",
    status: "PUBLISHED",
    isDefault: true,
    tone: "success",
    href: "/vi/t/demo/student/courses/co-ly-10",
  },
  {
    id: "co-van-10",
    title: "Ngữ văn 10 — Truyện Kiều",
    status: "DRAFT",
    isDefault: false,
    tone: "purple",
    href: "/vi/t/demo/student/courses/co-van-10",
  },
];

const meta: Meta<typeof StudentCoursesScreen> = {
  title: "Features/LMS/StudentCourses",
  component: StudentCoursesScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-edu-bg p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof StudentCoursesScreen>;

export const CoursesGrid_Loading: Story = {
  render: () => <CoursesSkeleton />,
};

export const CoursesGrid_Success: Story = {
  args: { courses: MOCK_COURSES, errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Toán 10 — Đại số & Giải tích"),
    ).toBeInTheDocument();
    // Status comes from the wire `status` field — the only badge left.
    await expect(canvas.getAllByText("Đã xuất bản")).toHaveLength(2);
    await expect(canvas.getByText("Bản nháp")).toBeInTheDocument();
  },
};

export const CoursesGrid_Empty: Story = {
  args: { courses: [], errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Lớp của bạn chưa có khoá học nào."),
    ).toBeInTheDocument();
  },
};

export const CoursesGrid_Error: Story = {
  args: { courses: [], errorKey: "network-error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Lỗi kết nối. Vui lòng thử lại.",
    );
  },
};

/** The student has no resolvable class enrollment, so the class-scoped list
 *  cannot be requested at all — a distinct, actionable state. */
export const CoursesGrid_NoClass: Story = {
  args: { courses: [], errorKey: "no-class" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Chưa xác định được lớp của bạn",
    );
  },
};
