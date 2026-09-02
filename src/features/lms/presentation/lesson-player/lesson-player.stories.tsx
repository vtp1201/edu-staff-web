import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { LessonPlayer } from "./lesson-player";
import type {
  GetLessonResult,
  LessonPlayerVm,
  TimelineItemVm,
} from "./lesson-player.i-vm";

/** One tile of each type + every state, mirroring the real contract's rule
 *  that only an EXAM tile reaches a student as UPCOMING_HIDDEN. */
const ITEMS: TimelineItemVm[] = [
  {
    id: "le-1",
    itemType: "LESSON",
    title: "Bài giảng: Quy tắc tính đạo hàm",
    description: null,
    url: null,
    dueAt: null,
    state: "OPEN",
    examUrl: null,
    examDurationMinutes: null,
  },
  {
    id: "as-1",
    itemType: "ASSIGNMENT",
    title: "Bài tập Đạo hàm #11",
    description: null,
    url: null,
    dueAt: "2026-05-05T16:00:00.000Z",
    state: "CLOSED",
    examUrl: null,
    examDurationMinutes: null,
  },
  {
    id: "do-1",
    itemType: "DOCUMENT",
    title: "Tài liệu: Bảng công thức đạo hàm",
    description: "Bảng tổng hợp công thức đạo hàm cơ bản.",
    url: "https://example.edu.vn/bang-cong-thuc.pdf",
    dueAt: null,
    state: "OPEN",
    examUrl: null,
    examDurationMinutes: null,
  },
  {
    id: "ex-1",
    itemType: "EXAM",
    title: "Kiểm tra 1 tiết — Chương IV & V",
    description: null,
    url: null,
    dueAt: "2026-05-08T02:00:00.000Z",
    state: "UPCOMING_HIDDEN",
    examUrl: "https://example.edu.vn/exams/ex-1",
    examDurationMinutes: 45,
  },
  {
    id: "le-2",
    itemType: "LESSON",
    title: "Bài giảng: Ứng dụng đạo hàm",
    description: null,
    url: null,
    dueAt: null,
    state: "OPEN",
    examUrl: null,
    examDurationMinutes: null,
  },
];

const BASE_VM: LessonPlayerVm = {
  courseId: "co-toan-10",
  courseName: "Toán 10 — Đại số & Giải tích",
  courseDescription: "Chương IV–V: giới hạn, đạo hàm và ứng dụng.",
  coursesListHref: "/vi/t/demo/student/courses",
  tone: "primary",
  items: ITEMS,
  initialLessonId: "le-1",
  errorKey: null,
};

const LESSON_BODIES: Record<string, string> = {
  "le-1":
    "Đạo hàm mô tả tốc độ biến thiên tức thời.\n\nQuy tắc tích: (u·v)' = u'v + uv'.",
  "le-2": "Khảo sát hàm số theo sáu bước.",
};

const getLesson = async (lessonId: string): Promise<GetLessonResult> => {
  const content = LESSON_BODIES[lessonId];
  if (!content) return { ok: false, errorKey: "not-found" };
  const title = ITEMS.find((i) => i.id === lessonId)?.title ?? "";
  return { ok: true, data: { id: lessonId, title, content } };
};

const meta: Meta<typeof LessonPlayer> = {
  title: "Features/LMS/CourseTimeline",
  component: LessonPlayer,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      // Fresh client per story so a cached lesson body cannot leak across them.
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
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
  args: {
    vm: BASE_VM,
    actions: { getLesson },
    assignmentsHref: "/vi/t/demo/student/assignments",
  },
};
export default meta;

type Story = StoryObj<typeof LessonPlayer>;

export const Timeline_Success: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // All four tile kinds render, with their BE-computed state labels.
    await expect(
      canvas.getByText("Tài liệu: Bảng công thức đạo hàm"),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Sắp diễn ra")).toBeInTheDocument();
    await expect(canvas.getByText("Đã đóng")).toBeInTheDocument();
    // The first readable lesson body loads on arrival.
    await waitFor(() =>
      expect(
        canvas.getByText(/Đạo hàm mô tả tốc độ biến thiên/),
      ).toBeInTheDocument(),
    );
  },
};

export const Timeline_SwitchLesson: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText(/Đạo hàm mô tả tốc độ biến thiên/),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: /Ứng dụng đạo hàm/ }),
    );
    await waitFor(() =>
      expect(
        canvas.getByText("Khảo sát hàm số theo sáu bước."),
      ).toBeInTheDocument(),
    );
  },
};

/** A course whose timeline holds no lesson at all — nothing to auto-open. */
export const Timeline_NoLesson: Story = {
  args: {
    vm: {
      ...BASE_VM,
      items: ITEMS.filter((i) => i.itemType !== "LESSON"),
      initialLessonId: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Chưa có nội dung")).toBeInTheDocument();
  },
};

export const Timeline_Empty: Story = {
  args: { vm: { ...BASE_VM, items: [], initialLessonId: null } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Khoá học này chưa có nội dung nào."),
    ).toBeInTheDocument();
  },
};

/** The lesson body read failed — the timeline stays usable. */
export const Timeline_LessonLoadError: Story = {
  args: { vm: { ...BASE_VM, initialLessonId: "le-missing" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByRole("alert")).toHaveTextContent(
        "Không tải được nội dung bài học.",
      ),
    );
  },
};

export const Timeline_CourseError: Story = {
  args: {
    vm: { ...BASE_VM, items: [], initialLessonId: null, errorKey: "forbidden" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("alert")[0]).toHaveTextContent(
      "Bạn không có quyền truy cập nội dung này.",
    );
  },
};

/**
 * QA gap-fill (US-E24.1) — BE documents `examUrl` as legally null "when the
 * deployment has not configured one". No story exercised this: every EXAM
 * fixture so far carried a link. Asserts the tile renders as a plain
 * informational row (no `<a>`, no broken `href="#"`, no ExternalLink icon)
 * rather than crashing or producing a dead link.
 */
export const Timeline_ExamNoDeepLink: Story = {
  args: {
    vm: {
      ...BASE_VM,
      items: [
        ...ITEMS,
        {
          id: "ex-2",
          itemType: "EXAM",
          title: "Kiểm tra cuối kỳ — chưa cấu hình liên kết",
          description: null,
          url: null,
          dueAt: "2026-06-01T02:00:00.000Z",
          state: "UPCOMING_HIDDEN",
          examUrl: null,
          examDurationMinutes: null,
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = await canvas.findByText(
      "Kiểm tra cuối kỳ — chưa cấu hình liên kết",
    );
    // The tile renders (no crash) as a non-interactive row: its ancestor is a
    // <div>, never an <a href="#">.
    const tile = title.closest("li");
    expect(tile?.querySelector("a")).toBeNull();
  },
};
