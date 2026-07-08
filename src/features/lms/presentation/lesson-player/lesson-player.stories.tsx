import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ChapterEntity } from "@/features/lms/domain/entities/chapter.entity";
import { LessonPlayer } from "./lesson-player";
import type { LessonPlayerActions, LessonPlayerVm } from "./lesson-player.i-vm";

const CHAPTERS: ChapterEntity[] = [
  {
    id: "ch1",
    title: "Chương 1 — Mệnh đề & Tập hợp",
    isEmpty: false,
    lessons: [
      {
        id: "l1",
        chapterId: "ch1",
        type: "video",
        order: 1,
        title: "Bài 1: Mệnh đề toán học",
        durationLabel: "32 phút",
        done: true,
      },
      {
        id: "l2",
        chapterId: "ch1",
        type: "video",
        order: 2,
        title: "Bài 2: Tập hợp & các phép toán",
        durationLabel: "28 phút",
        done: false,
      },
      {
        id: "l3",
        chapterId: "ch1",
        type: "pdf",
        order: 3,
        title: "Bài 3: Tài liệu ôn tập chương I",
        durationLabel: "12 trang",
        done: false,
        downloadHref: "/mock/handout.pdf",
      },
      {
        id: "l4",
        chapterId: "ch1",
        type: "text",
        order: 4,
        title: "Bài 4: Tổng kết lý thuyết",
        durationLabel: "6 phút đọc",
        done: false,
        blocks: [
          {
            heading: "Khái niệm",
            paragraphs: [
              "Một mệnh đề toán học là một khẳng định có giá trị chân lý xác định.",
            ],
          },
          { heading: "Ví dụ", paragraphs: ["“Số 7 là số nguyên tố” — đúng."] },
        ],
      },
    ],
  },
  {
    id: "ch2",
    title: "Chương 2 — Bất phương trình",
    isEmpty: true,
    lessons: [],
  },
];

function makeVm(initialActiveLessonId: string | null): LessonPlayerVm {
  return {
    courseId: "1",
    courseName: "Toán học",
    tone: "primary",
    coursesListHref: "/vi/t/demo/student/courses",
    chapters: CHAPTERS,
    initialActiveLessonId,
    errorKey: null,
  };
}

const actions: LessonPlayerActions = {
  markLessonComplete: async (lessonId) => ({
    ok: true,
    data: {
      lesson: {
        id: lessonId,
        chapterId: "ch1",
        type: "video",
        order: 2,
        title: "",
        durationLabel: "",
        done: true,
      },
      courseProgress: { done: 2, total: 4, pct: 50, status: "in-progress" },
    },
  }),
  getNote: async () => ({ ok: true, data: null }),
  saveNote: async (lessonId, content) => ({
    ok: true,
    data: { lessonId, content, updatedAt: new Date().toISOString() },
  }),
  listQuestions: async () => ({ ok: true, data: [] }),
  askQuestion: async (lessonId, question) => ({
    ok: true,
    data: {
      id: `srv-${Date.now()}`,
      lessonId,
      question,
      answer: null,
      askedAt: new Date().toISOString(),
    },
  }),
};

const meta: Meta<typeof LessonPlayer> = {
  title: "Features/LMS/LessonPlayer",
  component: LessonPlayer,
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

type Story = StoryObj<typeof LessonPlayer>;

export const LessonPlayer_Video: Story = {
  args: { vm: makeVm("l2"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Phát video" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("slider", { name: "Thanh tua video" }),
    ).toBeInTheDocument();
  },
};

export const LessonPlayer_Pdf: Story = {
  args: { vm: makeVm("l3"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: "Tải xuống tài liệu PDF" }),
    ).toBeInTheDocument();
  },
};

export const LessonPlayer_Text: Story = {
  args: { vm: makeVm("l4"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Khái niệm" }),
    ).toBeInTheDocument();
  },
};

export const ChapterList_Navigation: Story = {
  args: { vm: makeVm("l2"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Switch from the video lesson (l2) to the PDF lesson (l3).
    const l3 = canvas.getByRole("button", { name: /Bài 3: Tài liệu/ });
    await userEvent.click(l3);
    await expect(l3).toHaveAttribute("aria-current", "page");
    await expect(
      canvas.getByRole("link", { name: "Tải xuống tài liệu PDF" }),
    ).toBeInTheDocument();
  },
};

export const MarkComplete_Flow: Story = {
  args: { vm: makeVm("l2"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Đánh dấu hoàn thành" });
    await userEvent.click(button);
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Đã hoàn thành" }),
      ).toBeDisabled(),
    );
  },
};

export const Notes_Save: Story = {
  args: { vm: makeVm("l2"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByPlaceholderText("Ghi chú của bạn…");
    await userEvent.type(textarea, "Ghi chú kiểm thử");
    await userEvent.click(canvas.getByRole("button", { name: "Lưu ghi chú" }));
    await waitFor(() =>
      expect(canvas.getByText("Đã lưu ghi chú.")).toBeInTheDocument(),
    );
  },
};

export const QA_Ask: Story = {
  args: { vm: makeVm("l2"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Hỏi & Đáp" }));
    const input = canvas.getByPlaceholderText("Nhập câu hỏi của bạn…");
    await userEvent.type(input, "Đây là câu hỏi mới?");
    await userEvent.click(canvas.getByRole("button", { name: "Gửi câu hỏi" }));
    await waitFor(() =>
      expect(canvas.getByText("Đây là câu hỏi mới?")).toBeInTheDocument(),
    );
  },
};

// ── QA gap-fill (US-E11.6 QA gate) ──────────────────────────────────────────

/**
 * AC-7 — collapsing a chapter header hides its lesson list; expanding brings
 * it back. Fixture only has one chapter with real lessons (ch2 is `isEmpty`),
 * so full "collapse persists across navigating to a DIFFERENT chapter's
 * lesson" round-trip isn't exercisable with this data — this proves the
 * collapse/expand toggle itself + `aria-expanded` state.
 */
export const ChapterList_CollapseExpand: Story = {
  args: { vm: makeVm("l2"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chapterHeader = canvas.getByRole("button", {
      name: /Chương 1 — Mệnh đề/,
    });
    await expect(chapterHeader).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.getByRole("button", { name: /Bài 1: Mệnh đề toán học/ }),
    ).toBeInTheDocument();

    await userEvent.click(chapterHeader);
    await expect(chapterHeader).toHaveAttribute("aria-expanded", "false");
    await expect(
      canvas.queryByRole("button", { name: /Bài 1: Mệnh đề toán học/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(chapterHeader);
    await expect(chapterHeader).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.getByRole("button", { name: /Bài 1: Mệnh đề toán học/ }),
    ).toBeInTheDocument();
  },
};

/**
 * AC-8 — video controls are keyboard-operable: Space toggles play/pause on
 * the focused play button; ArrowRight/ArrowLeft move the seek slider.
 */
export const VideoPlayer_KeyboardControls: Story = {
  args: { vm: makeVm("l1"), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const playButton = canvas.getByRole("button", { name: "Phát video" });
    playButton.focus();
    await userEvent.keyboard(" ");
    await expect(
      canvas.getByRole("button", { name: "Tạm dừng video" }),
    ).toBeInTheDocument();

    const slider = canvas.getByRole("slider", { name: "Thanh tua video" });
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(slider).toHaveAttribute("aria-valuenow", "5");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
  },
};

/**
 * AC-15 — mobile (< 768px) chapter-list accordion toggle. `@storybook/addon-viewport`
 * isn't installed (US-E17.11 precedent); drive the real Playwright viewport
 * directly so the `md:hidden` toggle button is exercised meaningfully.
 */
export const ChapterList_MobileToggle: Story = {
  args: { vm: makeVm("l2"), actions },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 812);
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", {
      name: "Danh sách bài học",
    });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.getByRole("button", { name: /Bài 1: Mệnh đề toán học/ }),
    ).toBeVisible();
  },
};

/**
 * Empty-course fallback: course has no chapters at all — the chapter-list nav
 * ("Danh sách bài học") shows its `BookOpen` empty state AND the content pane
 * (`LessonBody`, lesson === null) shows its own empty state. Both currently
 * reuse the identical copy string "Giáo viên chưa tải lên nội dung cho khoá
 * học này." (`player.content.empty.body` === `player.chapterList.emptyCourse`)
 * — flagged as a MINOR copy-duplication finding (not a functional gap): two
 * DOM nodes render the same text, so this asserts count === 2 rather than a
 * single unique match.
 */
export const LessonPlayer_EmptyContent: Story = {
  args: {
    vm: { ...makeVm(null), chapters: [] },
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const matches = canvas.getAllByText(
      "Giáo viên chưa tải lên nội dung cho khoá học này.",
    );
    await expect(matches).toHaveLength(2);
    await expect(
      canvas.getByText("Chưa có nội dung"), // player.content.empty.title (content pane only)
    ).toBeInTheDocument();
  },
};
