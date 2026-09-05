import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  TimelineItemVm,
  WeekVm,
} from "../course-timeline/course-timeline.i-vm";
import { CoursePlayer } from "./course-player";
import type { ActiveItemVm, CoursePlayerVm } from "./course-player.i-vm";

const HREF = "/vi/t/demo/student/courses/co-toan-10";

function itemVm(over: Partial<TimelineItemVm>): TimelineItemVm {
  return {
    id: "le-1",
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
        startAt: null,
      }),
    ],
  },
  {
    key: "2026-W17",
    weekStart: "2026-04-20",
    weekEnd: "2026-04-26",
    items: [
      itemVm({}),
      itemVm({
        id: "as-1",
        itemType: "ASSIGNMENT",
        title: "Bài tập Đạo hàm #11",
        dueAt: "2026-04-24T16:00:00.000Z",
      }),
    ],
  },
  {
    key: "2026-W19",
    weekStart: "2026-05-04",
    weekEnd: "2026-05-10",
    items: [
      itemVm({
        id: "ex-1",
        itemType: "EXAM",
        title: "Kiểm tra 1 tiết — Chương IV & V",
        state: "UPCOMING_HIDDEN",
        locked: true,
        opensAt: "2026-05-08T02:00:00.000Z",
      }),
    ],
  },
];

const LESSON: ActiveItemVm = {
  kind: "lesson",
  id: "le-1",
  title: "Bài giảng: Quy tắc tính đạo hàm",
  state: "OPEN",
  startAt: "2026-04-20T07:00:00.000Z",
  dueAt: null,
  content:
    "Đạo hàm mô tả tốc độ biến thiên tức thời.\n\nQuy tắc tích: (u·v)' = u'v + uv'.",
};

function vmFor(activeItem: ActiveItemVm, activeItemId: string): CoursePlayerVm {
  return {
    courseId: "co-toan-10",
    courseName: "Toán 10 — Đại số & Giải tích",
    courseHref: HREF,
    tone: "primary",
    weeks: WEEKS,
    activeItemId,
    activeItem,
    prevHref: `${HREF}/items/doc-1`,
    nextHref: `${HREF}/items/as-1`,
    activeItemErrorKey: null,
  };
}

const meta: Meta<typeof CoursePlayer> = {
  title: "Features/LMS/CoursePlayer",
  component: CoursePlayer,
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
  args: { vm: vmFor(LESSON, "le-1"), submitAssignment: null },
};
export default meta;

type Story = StoryObj<typeof CoursePlayer>;

/** LESSON, text only — the default per D4 (BE stores lessons as text). */
export const Lesson: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: /Quy tắc tính đạo hàm/ }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(/Đạo hàm mô tả tốc độ biến thiên/),
    ).toBeInTheDocument();
    // No embeddable link in the body → no player frame at all.
    expect(canvasElement.querySelector("iframe")).toBeNull();
    // The sidebar marks the item being viewed for assistive tech too.
    const current = canvas.getByRole("link", { current: true });
    await expect(current).toHaveAttribute("href", `${HREF}/items/le-1`);
    // Position in SIDEBAR order (doc-1, le-1, as-1, ex-1), not in week order.
    await expect(canvas.getByText("2/4")).toBeInTheDocument();
  },
};

/** D4: the frame appears only because the body carries an ALLOWLISTED link. */
export const LessonWithEmbed: Story = {
  args: {
    vm: vmFor(
      {
        ...LESSON,
        content:
          "Xem video ôn tập: https://www.youtube.com/watch?v=abc123 rồi làm bài.",
      },
      "le-1",
    ),
  },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector("iframe");
    expect(frame).not.toBeNull();
    // Rewritten to the embed path, never the raw watch URL.
    expect(frame?.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
    // The security attributes are on the element, not just in the helper.
    expect(frame?.getAttribute("title")).toMatch(/Quy tắc tính đạo hàm/);
    expect(frame?.getAttribute("sandbox")).toBe(
      "allow-scripts allow-same-origin allow-presentation",
    );
    expect(frame?.getAttribute("referrerpolicy")).toBe("no-referrer");
  },
};

/** A body link to a NON-allowlisted origin must not become an iframe. */
export const LessonWithBlockedEmbed: Story = {
  args: {
    vm: vmFor(
      {
        ...LESSON,
        content: "Xem tại https://youtube.com.evil.com/watch?v=abc123",
      },
      "le-1",
    ),
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector("iframe")).toBeNull();
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/youtube\.com\.evil\.com/),
    ).toBeInTheDocument();
  },
};

/** DOCUMENT: outbound link + a preview only when the origin is allowlisted. */
export const Document: Story = {
  args: {
    vm: vmFor(
      {
        kind: "document",
        id: "doc-1",
        title: "Tài liệu: Bảng công thức đạo hàm",
        state: "OPEN",
        startAt: null,
        dueAt: null,
        description: "Bảng tổng hợp công thức đạo hàm cơ bản.",
        url: "https://example.edu.vn/bang-cong-thuc.pdf",
      },
      "doc-1",
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: /Mở liên kết/ });
    // Non-negotiable for every BE-sourced outbound link.
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveAttribute("target", "_blank");
    // Not allowlisted → guidance text instead of a broken frame.
    expect(canvasElement.querySelector("iframe")).toBeNull();
    await expect(canvas.getByText(/chỉ hiển thị khi liên kết/)).toBeVisible();
  },
};

/** EXAM, open, with an external deep link. */
export const Exam: Story = {
  args: {
    vm: vmFor(
      {
        kind: "exam",
        id: "ex-1",
        title: "Kiểm tra 1 tiết — Chương IV & V",
        state: "OPEN",
        startAt: "2026-05-08T02:00:00.000Z",
        dueAt: "2026-05-08T02:45:00.000Z",
        examUrl: "https://example.edu.vn/exams/ex-1",
        examHref: "/vi/t/demo/student/exams/ex-1",
        examDurationMinutes: 45,
      },
      "ex-1",
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cta = canvas.getByRole("link", { name: /Vào làm bài/ });
    await expect(cta).toHaveAttribute("rel", "noopener noreferrer");
    await expect(canvas.getByText("Thời lượng 45 phút")).toBeInTheDocument();
  },
};

/** D7: the only state a student can reach unopened — an EXAM before its time. */
export const Locked: Story = {
  args: {
    vm: vmFor(
      {
        kind: "locked",
        id: "ex-1",
        title: "Kiểm tra 1 tiết — Chương IV & V",
        itemType: "EXAM",
        opensAt: "2026-05-08T02:00:00.000Z",
      },
      "ex-1",
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The opening time is VISIBLE text (the date order/separator is `vi`'s).
    await expect(canvas.getByText(/Nội dung sẽ mở lúc/)).toBeVisible();
    // State is spelled out, never colour alone.
    await expect(canvas.getAllByText("Sắp mở").length).toBeGreaterThan(0);
    // Nothing submittable, nothing embedded.
    expect(canvasElement.querySelector("iframe")).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Nộp bài" })).toBeNull();
  },
};

/** The item's OWN read failed: header, sidebar and navigation still work. */
export const BodyReadFailed: Story = {
  args: {
    vm: {
      ...vmFor({ ...LESSON, content: "" }, "le-1"),
      activeItemErrorKey: "network-error",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Lỗi kết nối. Vui lòng thử lại.",
    );
    await expect(
      canvas.getByRole("link", { name: /Mục tiếp theo/ }),
    ).toBeInTheDocument();
  },
};

/** Week groups collapse in place; `aria-expanded` points at what it hides. */
export const CollapseWeek: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: /Tuần 20.04 – 26.04/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panelId = toggle.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = canvasElement.ownerDocument.getElementById(panelId ?? "");
    expect(panel).not.toBeNull();

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel?.hasAttribute("hidden")).toBe(true);
  },
};

/** 375px: one column, the panel below the content, nothing overflows. */
export const Viewport375: Story = {
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 900);
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: /Quy tắc tính đạo hàm/ }),
    ).toBeInTheDocument();
    expect(canvasElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.clientWidth + 1,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(376);
  },
};

/**
 * A locked (unreleased) sidebar row is NOT a link — same contract the timeline
 * gives it (US-E24.3 `LockedRowRejectsActivation`). One unreleased item must
 * not be a door in one list and a wall in the other.
 */
export const LockedSidebarRowIsNotNavigable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByText("Kiểm tra 1 tiết — Chương IV & V");
    const row = title.closest("[aria-disabled]");
    expect(row).not.toBeNull();
    if (!row) throw new Error("expected a locked row");

    // Nothing activatable inside it, and no link points at the locked item.
    expect(row.querySelector("a")).toBeNull();
    expect(canvas.queryByRole("link", { name: /Kiểm tra 1 tiết/ })).toBeNull();

    // A real click changes nothing, and it cannot take focus.
    await userEvent.click(row);
    expect(row.querySelector("a")).toBeNull();
    (row as HTMLElement).focus?.();
    expect(row.contains(document.activeElement)).toBe(false);

    // The opening date is still stated in VISIBLE text — removing the link
    // removed no information. (The separator is `vi` CLDR's, not ours.)
    expect(row.textContent).toMatch(/Mở 08.05/);
  },
};
