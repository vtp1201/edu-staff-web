import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { CourseTimeline } from "./course-timeline";
import type {
  CourseTimelineVm,
  GetLessonResult,
  RetryListItemsResult,
  TimelineItemVm,
  WeekVm,
} from "./course-timeline.i-vm";

function itemVm(over: Partial<TimelineItemVm>): TimelineItemVm {
  return {
    id: "i1",
    itemType: "LESSON",
    title: "Bài giảng: Quy tắc tính đạo hàm",
    state: "OPEN",
    startAt: "2026-04-20T07:00:00.000Z",
    dueAt: null,
    description: null,
    url: null,
    examUrl: null,
    examDurationMinutes: null,
    locked: false,
    opensAt: null,
    ...over,
  };
}

/** Three weeks + the un-windowed "Luôn mở" group, one tile of each type. */
const WEEKS: WeekVm[] = [
  {
    key: "always",
    weekStart: null,
    weekEnd: null,
    items: [
      itemVm({
        id: "doc-1",
        itemType: "DOCUMENT",
        title: "Tài liệu: Bảng công thức đạo hàm",
        description: "Bảng tổng hợp công thức đạo hàm cơ bản.",
        url: "https://example.edu.vn/bang-cong-thuc.pdf",
        startAt: null,
      }),
    ],
  },
  {
    key: "2026-W17",
    weekStart: "2026-04-20",
    weekEnd: "2026-04-26",
    items: [
      itemVm({ id: "le-1" }),
      itemVm({
        id: "as-1",
        itemType: "ASSIGNMENT",
        title: "Bài tập Đạo hàm #11",
        state: "CLOSED",
        dueAt: "2026-04-24T16:00:00.000Z",
      }),
    ],
  },
  {
    key: "2026-W18",
    weekStart: "2026-04-27",
    weekEnd: "2026-05-03",
    items: [
      itemVm({
        id: "le-2",
        title: "Bài giảng: Ứng dụng đạo hàm",
        startAt: "2026-04-27T07:00:00.000Z",
        dueAt: "2026-05-03T16:00:00.000Z",
      }),
    ],
  },
];

const EXAM_UPCOMING: TimelineItemVm = itemVm({
  id: "ex-1",
  itemType: "EXAM",
  title: "Kiểm tra 1 tiết — Chương IV & V",
  state: "UPCOMING_HIDDEN",
  startAt: "2026-05-08T02:00:00.000Z",
  locked: true,
  opensAt: "2026-05-08T02:00:00.000Z",
  examUrl: "https://example.edu.vn/exams/ex-1",
  examDurationMinutes: 45,
});

const BASE_VM: CourseTimelineVm = {
  courseId: "co-toan-10",
  courseName: "Toán 10 — Đại số & Giải tích",
  tone: "primary",
  openCount: 3,
  weeks: WEEKS,
  errorKey: null,
  mode: "student",
};

const LESSON_BODIES: Record<string, string> = {
  "le-1":
    "Đạo hàm mô tả tốc độ biến thiên tức thời.\n\nQuy tắc tích: (u·v)' = u'v + uv'.",
  "le-2": "Khảo sát hàm số theo sáu bước.",
};

const getLesson = async (lessonId: string): Promise<GetLessonResult> => {
  const content = LESSON_BODIES[lessonId];
  if (!content) return { ok: false, errorKey: "not-found" };
  return { ok: true, data: { id: lessonId, title: "", content } };
};

const retryListItems = async (): Promise<RetryListItemsResult> => ({
  ok: true,
  data: { weeks: WEEKS, openCount: 3 },
});

const meta: Meta<typeof CourseTimeline> = {
  title: "Features/LMS/CourseTimeline",
  component: CourseTimeline,
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
  args: {
    vm: BASE_VM,
    actions: { getLesson, retryListItems },
    assignmentsHref: "/vi/t/demo/student/assignments",
  },
};
export default meta;

type Story = StoryObj<typeof CourseTimeline>;

export const ThreeWeeks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Week grouping: the un-windowed group first, then weeks ascending.
    const headings = canvas.getAllByRole("heading", { level: 2 });
    // The day/month separator is whatever the locale's CLDR pattern uses
    // (`vi` renders `20-04`), so the assertion pins the ORDER and the dates,
    // not the punctuation.
    await expect(headings[0]?.textContent).toBe("Luôn mở");
    await expect(headings[1]?.textContent).toMatch(/^Tuần 20.04 – 26.04$/);
    await expect(headings[2]?.textContent).toMatch(/^Tuần 27.04 – 03.05$/);
    await expect(canvas.getByText("3 mục đang mở")).toBeInTheDocument();
    // Every row is keyboard-operable in reading order.
    await expect(
      canvas.getAllByRole("button", { expanded: false }),
    ).toHaveLength(4);
  },
};

/** Clicking an OPEN row expands it inline (TEMP until US-E24.5). */
export const ExpandRow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole("button", { name: /Quy tắc tính đạo hàm/ });
    await userEvent.click(row);
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await waitFor(() =>
      expect(
        canvas.getByText(/Đạo hàm mô tả tốc độ biến thiên/),
      ).toBeInTheDocument(),
    );

    // A11Y-001: `aria-expanded` must point at what it expands — the id on the
    // button's `aria-controls` has to resolve to the panel that just appeared.
    const panelId = row.getAttribute("aria-controls");
    await expect(panelId).toBeTruthy();
    const panel = canvasElement.ownerDocument.getElementById(panelId ?? "");
    await expect(panel).toBeInTheDocument();
    await expect(panel).toHaveTextContent(/Đạo hàm mô tả tốc độ biến thiên/);
  },
};

/** A CLOSED row stays openable — a student re-reads it to revise. */
export const AllClosed: Story = {
  args: {
    vm: {
      ...BASE_VM,
      openCount: 0,
      weeks: [
        {
          ...WEEKS[1],
          items: (WEEKS[1]?.items ?? []).map((i) => ({
            ...i,
            state: "CLOSED" as const,
            dueAt: "2026-04-24T16:00:00.000Z",
          })),
        },
      ] as WeekVm[],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("0 mục đang mở")).toBeInTheDocument();
    await expect(canvas.getAllByText("Đã đóng — chỉ xem")).not.toHaveLength(0);
    const row = canvas.getByRole("button", { name: /Quy tắc tính đạo hàm/ });
    await userEvent.click(row);
    await expect(row).toHaveAttribute("aria-expanded", "true");
  },
};

/** D7: only an EXAM reaches a student unopened — locked, never navigable. */
export const WithUpcomingExam: Story = {
  args: {
    vm: {
      ...BASE_VM,
      weeks: [
        ...WEEKS,
        {
          key: "2026-W19",
          weekStart: "2026-05-04",
          weekEnd: "2026-05-10",
          items: [EXAM_UPCOMING],
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByText("Kiểm tra 1 tiết — Chương IV & V");
    // Not a button and not focusable: it cannot be opened by mouse OR keyboard.
    expect(title.closest("button")).toBeNull();
    const row = title.closest("[aria-disabled]");
    expect(row).not.toBeNull();
    // The opening time is VISIBLE text, not a hover-only tooltip. (The date
    // order/separator is the locale's — `vi` renders "09:00 08-05".)
    await expect(row?.textContent).toMatch(/Nội dung sẽ mở lúc .*08.05/);
    // The state is spelled out, never colour alone.
    await expect(canvas.getAllByText("Sắp mở").length).toBeGreaterThan(0);
  },
};

export const Empty: Story = {
  args: { vm: { ...BASE_VM, weeks: [], openCount: 0 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Giáo viên chưa thêm nội dung cho khoá học này."),
    ).toBeInTheDocument();
  },
};

/** Timeline read failed, course read did not: header stays, retry re-reads. */
export const TimelineError: Story = {
  args: {
    vm: { ...BASE_VM, weeks: [], openCount: 0, errorKey: "network-error" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Lỗi kết nối. Vui lòng thử lại.",
    );
    // The header still renders next to the failure.
    await expect(
      canvas.getByRole("heading", { name: /Toán 10/ }),
    ).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(canvas.queryByRole("alert")).toBeNull());
    await expect(canvas.getByText("3 mục đang mở")).toBeInTheDocument();
  },
};

/** The lazy lesson-body read of an expanded row is loading. */
export const LessonBodyLoading: Story = {
  args: {
    actions: {
      getLesson: () => new Promise<GetLessonResult>(() => {}),
      retryListItems,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Quy tắc tính đạo hàm/ }),
    );
    await waitFor(() =>
      expect(
        canvas.getByText("Đang tải nội dung bài học..."),
      ).toBeInTheDocument(),
    );
  },
};

/** 375px — the rail keeps its 34px gutter and the row card wraps, no overflow. */
export const Mobile375: Story = {
  globals: { viewport: { value: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Toán 10/ }),
    ).toBeInTheDocument();
    expect(canvasElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.clientWidth + 1,
    );
  },
};
