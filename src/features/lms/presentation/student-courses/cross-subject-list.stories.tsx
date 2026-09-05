import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  CrossSubjectGroupsVm,
  CrossSubjectRowVm,
} from "./cross-subject.i-vm";
import { CrossSubjectList } from "./cross-subject-list";

/** Windows are relative to render time so the row's date text is always a
 *  plausible one; urgency itself is a SERVER-computed flag the VM carries. */
const inHours = (h: number) =>
  new Date(Date.now() + h * 60 * 60 * 1000).toISOString();

function row(over: Partial<CrossSubjectRowVm> = {}): CrossSubjectRowVm {
  return {
    key: "c1:i1",
    itemId: "i1",
    itemType: "ASSIGNMENT",
    title: "Bài tập: Hàm số bậc hai",
    state: "OPEN",
    startAt: null,
    dueAt: inHours(72),
    courseTitle: "Toán 10",
    tone: "primary",
    urgent: false,
    hoursLeft: null,
    cta: {
      kind: "view",
      href: "/vi/t/demo/student/courses/c1",
      external: false,
    },
    ...over,
  };
}

const URGENT = row({
  key: "c1:i-urgent",
  title: "Bài tập: Phương trình bậc hai",
  dueAt: inHours(6),
  urgent: true,
  hoursLeft: 6,
});

const CALM = row({
  key: "c2:i-calm",
  title: "Bài tập: Đọc hiểu Truyện Kiều",
  courseTitle: "Ngữ văn 10",
  tone: "purple",
  dueAt: inHours(120),
  cta: { kind: "view", href: "/vi/t/demo/student/courses/c2", external: false },
});

const EXAM_OPEN = row({
  key: "c1:ex-1",
  itemType: "EXAM",
  title: "Kiểm tra giữa kỳ — Đại số",
  dueAt: inHours(30),
  cta: {
    kind: "start",
    href: "/vi/t/demo/student/exams/ex-1",
    external: false,
  },
});

const EXAM_UPCOMING = row({
  key: "c3:ex-2",
  itemType: "EXAM",
  title: "Kiểm tra cuối kỳ — Vật lý",
  state: "UPCOMING_HIDDEN",
  startAt: inHours(240),
  dueAt: null,
  courseTitle: "Vật lý 10",
  tone: "success",
  cta: { kind: "view", href: "/vi/t/demo/student/courses/c3", external: false },
});

const CLOSED = row({
  key: "c1:i-old",
  title: "Bài tập: Tập hợp và mệnh đề",
  state: "CLOSED",
  dueAt: inHours(-96),
});

const groups = (over: Partial<CrossSubjectGroupsVm>): CrossSubjectGroupsVm => ({
  open: [],
  upcoming: [],
  closed: [],
  ...over,
});

const meta: Meta<typeof CrossSubjectList> = {
  title: "Features/LMS/CrossSubjectList",
  component: CrossSubjectList,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  args: {
    hrefFor: (sub: string) => `/vi/t/demo/student/courses?view=exam&sub=${sub}`,
  },
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

type Story = StoryObj<typeof CrossSubjectList>;

/**
 * `?view=assignment&sub=open` with an urgent row.
 *
 * Two things this proves that no unit test can: the assignment view has NO
 * "Sắp mở" tab (D7 — a student read never returns an unreleased assignment),
 * and urgency is carried by TEXT ("còn 6 giờ"), not by colour alone.
 */
export const AssignmentOpenUrgent: Story = {
  args: {
    view: "assignment",
    sub: "open",
    groups: groups({ open: [URGENT, CALM], closed: [CLOSED] }),
    hrefFor: (sub: string) =>
      `/vi/t/demo/student/courses?view=assignment&sub=${sub}`,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // D7: only the exam view has an "Sắp mở" group.
    const tabs = canvas.getAllByRole("tab");
    await expect(tabs).toHaveLength(2);
    await expect(
      canvas.queryByRole("tab", { name: /Sắp mở/ }),
    ).not.toBeInTheDocument();

    // The tablist state is spelled out for AT, and the counts are announced
    // as words rather than as a stray numeral next to the tab name.
    await expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    await expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    await expect(canvas.getByLabelText("Đang mở, 2 mục")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Đã đóng, 1 mục")).toBeInTheDocument();

    // Urgency: literal text + the tinted border, never colour alone.
    await expect(canvas.getByText(/còn 6 giờ/)).toBeInTheDocument();
    const urgentRow = canvas
      .getByText("Bài tập: Phương trình bậc hai")
      .closest("li");
    await expect(urgentRow).toHaveClass("border-edu-error/45");
    // The calm row is NOT tinted — the signal has to distinguish.
    await expect(
      canvas.getByText("Bài tập: Đọc hiểu Truyện Kiều").closest("li"),
    ).toHaveClass("border-border");

    // Every row's single CTA names its own item, so a link list is not N
    // identical "Xem trong khoá học" entries (WCAG 2.4.4).
    await expect(
      canvas.getByRole("link", {
        name: "Xem Bài tập: Phương trình bậc hai trong khoá học Toán 10",
      }),
    ).toHaveAttribute("href", "/vi/t/demo/student/courses/c1");
  },
};

/** `?view=exam&sub=upcoming` — the ONLY place a student meets an unreleased
 *  item (D7). The row is locked, and the exam view gains the third tab. */
export const ExamUpcoming: Story = {
  args: {
    view: "exam",
    sub: "upcoming",
    groups: groups({ open: [EXAM_OPEN], upcoming: [EXAM_UPCOMING] }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("tab")).toHaveLength(3);
    const upcomingTab = canvas.getByRole("tab", { name: /Sắp mở/ });
    await expect(upcomingTab).toHaveAttribute("aria-selected", "true");
    // The panel is labelled by the tab that selected it — one panel exists at
    // a time (the server renders only the active group).
    await expect(canvas.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      upcomingTab.id,
    );

    await expect(
      canvas.getByText("Kiểm tra cuối kỳ — Vật lý"),
    ).toBeInTheDocument();
    // Only the active group is rendered: the open exam is NOT in the DOM.
    await expect(
      canvas.queryByText("Kiểm tra giữa kỳ — Đại số"),
    ).not.toBeInTheDocument();
    // An unreleased exam never offers "Vào làm bài".
    await expect(
      canvas.queryByRole("link", { name: /Vào làm bài/ }),
    ).not.toBeInTheDocument();
  },
};

/** `?view=exam&sub=open` — the one state that offers "Vào làm bài". */
export const ExamOpen: Story = {
  args: {
    view: "exam",
    sub: "open",
    groups: groups({ open: [EXAM_OPEN], upcoming: [EXAM_UPCOMING] }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", {
        name: "Vào làm bài: Kiểm tra giữa kỳ — Đại số",
      }),
    ).toHaveAttribute("href", "/vi/t/demo/student/exams/ex-1");
  },
};

/** `?sub=closed` — past items stay readable for revision; the row is muted but
 *  never urgent, however far past its deadline. */
export const Closed: Story = {
  args: {
    view: "assignment",
    sub: "closed",
    groups: groups({ open: [URGENT], closed: [CLOSED] }),
    hrefFor: (sub: string) =>
      `/vi/t/demo/student/courses?view=assignment&sub=${sub}`,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closedTab = canvas.getByRole("tab", { name: /Đã đóng/ });
    await expect(closedTab).toHaveAttribute("aria-selected", "true");
    const closedRow = canvas
      .getByText("Bài tập: Tập hợp và mệnh đề")
      .closest("li");
    await expect(closedRow).toHaveClass("border-border");
    await expect(canvas.queryByText(/còn \d+ giờ/)).not.toBeInTheDocument();
    // Switching tab is a real navigation, not a client toggle — the URL is the
    // state, so back/forward work.
    await expect(canvas.getByRole("tab", { name: /Đang mở/ })).toHaveAttribute(
      "href",
      "/vi/t/demo/student/courses?view=assignment&sub=open",
    );
  },
};

/** An empty GROUP is not an empty screen: the tabs (and their counts) stay so
 *  the reader can leave the group they landed in. */
export const EmptyGroup: Story = {
  args: {
    view: "assignment",
    sub: "closed",
    groups: groups({ open: [URGENT] }),
    hrefFor: (sub: string) =>
      `/vi/t/demo/student/courses?view=assignment&sub=${sub}`,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có mục nào trong nhóm này."),
    ).toBeInTheDocument();
    await expect(canvas.getAllByRole("tab")).toHaveLength(2);
    await expect(canvas.getByLabelText("Đang mở, 1 mục")).toBeInTheDocument();
  },
};

/** 320px — the row wraps (chip + title, then the pill and the CTA) instead of
 *  forcing a horizontal scrollbar. */
export const Viewport320_RowWraps: Story = {
  args: {
    view: "exam",
    sub: "open",
    groups: groups({ open: [EXAM_OPEN] }),
  },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(320, 900);
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Kiểm tra giữa kỳ — Đại số")).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(321);
  },
};

/** Every tab and every CTA clears the 44px touch floor at mobile width. */
export const TouchTarget_TabsAndCta: Story = {
  args: {
    view: "exam",
    sub: "open",
    groups: groups({ open: [EXAM_OPEN], upcoming: [EXAM_UPCOMING] }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const tab of canvas.getAllByRole("tab")) {
      await expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        44,
      );
    }
    const cta = canvas.getByRole("link", { name: /Vào làm bài/ });
    cta.focus();
    await expect(cta).toHaveFocus();
    await expect(getComputedStyle(cta).boxShadow).not.toBe("none");
  },
};
