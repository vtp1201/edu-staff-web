import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { CoursesSkeleton } from "./courses-skeleton";
import { StudentCoursesScreen } from "./student-courses-screen";
import type { CourseCardVm } from "./student-courses-screen.i-vm";

/** Deadlines are relative to render time so the 48h urgency tone is exercised
 *  the same way in every run (the flag itself is server-computed — a story
 *  supplies it directly, exactly like the RSC does). */
const inHours = (h: number) =>
  new Date(Date.now() + h * 60 * 60 * 1000).toISOString();

/** Shaped from the REAL `CourseSummary` + the derived timeline summary — no
 *  progress %, no average score (the contract carries neither). */
const MATH: CourseCardVm = {
  id: "co-toan-10",
  title: "Toán 10 — Đại số & Giải tích",
  status: "PUBLISHED",
  isDefault: true,
  tone: "primary",
  href: "/vi/t/demo/student/courses/co-toan-10",
  openCount: 4,
  nextDue: {
    id: "it-1",
    title: "Bài tập: Hàm số bậc hai",
    itemType: "ASSIGNMENT",
    dueAt: inHours(120),
    dueSoon: false,
  },
  itemsFailed: false,
};

const PHYSICS: CourseCardVm = {
  id: "co-ly-10",
  title: "Vật lý 10 — Điện từ trường",
  status: "PUBLISHED",
  isDefault: true,
  tone: "success",
  href: "/vi/t/demo/student/courses/co-ly-10",
  openCount: 2,
  nextDue: null,
  itemsFailed: false,
};

/** A published-but-empty course AND the DRAFT badge case in one row. */
const LITERATURE: CourseCardVm = {
  id: "co-van-10",
  title: "Ngữ văn 10 — Truyện Kiều",
  status: "DRAFT",
  isDefault: false,
  tone: "purple",
  href: "/vi/t/demo/student/courses/co-van-10",
  openCount: 0,
  nextDue: null,
  itemsFailed: false,
};

const MOCK_COURSES: CourseCardVm[] = [MATH, PHYSICS, LITERATURE];

const meta: Meta<typeof StudentCoursesScreen> = {
  title: "Features/LMS/StudentCourses",
  component: StudentCoursesScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="vi"
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
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
    await expect(canvas.getByText("4 mục đang mở")).toBeInTheDocument();
    // A course with nothing scheduled says so instead of showing a blank slot.
    await expect(
      canvas.getAllByText("Không có mục nào sắp đến hạn."),
    ).toHaveLength(2);
    // Only the unpublished course is badged (a student's list is otherwise
    // all-PUBLISHED, so a badge on every card would be noise).
    await expect(canvas.getByText("Bản nháp")).toBeInTheDocument();
  },
};

/** A deadline inside 48h — warning tone AND the "Sắp đến hạn" label, so the
 *  urgency is never carried by colour alone (WCAG 1.4.1). */
export const CoursesGrid_DueSoon: Story = {
  args: {
    courses: [
      {
        ...MATH,
        nextDue: {
          id: "it-9",
          title: "Bài tập: Phương trình bậc hai",
          itemType: "ASSIGNMENT",
          dueAt: inHours(6),
          dueSoon: true,
        },
      },
    ],
    errorKey: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Sắp đến hạn")).toBeInTheDocument();
    await expect(
      canvas.getByText("Bài tập: Phương trình bậc hai"),
    ).toBeInTheDocument();
    // Type label + a formatted deadline (the exact date pattern is locale-owned
    // — `useFormatter`, same options as the course timeline).
    await expect(canvas.getByText(/^Bài tập · hạn .+/)).toBeInTheDocument();
  },
};

/** A course whose timeline is genuinely empty — still a real card, with an
 *  explicit "0 mục đang mở" rather than a hidden or blank tile. */
export const CoursesGrid_EmptyCourse: Story = {
  args: { courses: [LITERATURE], errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("0 mục đang mở")).toBeInTheDocument();
    await expect(
      canvas.getByText("Không có mục nào sắp đến hạn."),
    ).toBeInTheDocument();
  },
};

/** ONE course's timeline read failed. That card degrades to "—" (unknown, not
 *  zero) and keeps its link; its siblings are untouched — a single bad fan-out
 *  leg must never blank the page. */
export const CoursesGrid_PartialError: Story = {
  args: {
    courses: [
      MATH,
      {
        ...PHYSICS,
        openCount: null,
        nextDue: null,
        itemsFailed: true,
      },
    ],
    errorKey: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("—")).toBeInTheDocument();
    await expect(canvas.getByText("4 mục đang mở")).toBeInTheDocument();
    const degraded = canvas.getByRole("link", {
      name: /Vật lý 10[\s\S]*Không tải được danh sách mục/,
    });
    await expect(degraded).toHaveAttribute(
      "href",
      "/vi/t/demo/student/courses/co-ly-10",
    );
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
