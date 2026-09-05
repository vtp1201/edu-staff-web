import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
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
  /* The route-owned props every story shares: US-E24.4 made the screen serve
     three `?view=` views, and the card grid is the default one. */
  args: {
    view: "all",
    viewHrefFor: (view: string) =>
      view === "all"
        ? "/vi/t/demo/student/courses"
        : `/vi/t/demo/student/courses?view=${view}`,
    cross: null,
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
    // …and it is spelled into the link's aria-label, which otherwise REPLACES
    // the whole subtree, so AT would never hear it (A11Y-005, WCAG 4.1.2).
    await expect(
      canvas.getByRole("link", { name: /Ngữ văn 10[\s\S]*Bản nháp/ }),
    ).toBeInTheDocument();
    // The focus ring is drawn INSIDE the card, which clips overflow — an
    // outward ring would be invisible (A11Y-001, WCAG 2.4.7).
    await expect(canvas.getByRole("link", { name: /Toán 10/ })).toHaveClass(
      "focus-visible:ring-inset",
    );
    // A non-urgent deadline shows no urgency chip.
    await expect(canvas.queryByText("Gấp")).not.toBeInTheDocument();
  },
};

/** A deadline inside 48h. Urgency rides on TWO colour-independent channels —
 *  the warning-triangle icon and the "Gấp" chip — plus the tone (WCAG 1.4.1),
 *  and the chip is also inside the link's accessible name. The eyebrow itself
 *  must NOT use `text-edu-warning-text` (4.37:1 at 10px fails AA, A11Y-003). */
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
    const eyebrow = canvas.getByText("Sắp đến hạn");
    await expect(eyebrow).toBeInTheDocument();
    await expect(canvas.getByText("Gấp")).toBeInTheDocument();
    // The urgency word is in the accessible name too — a screen reader hears
    // only the link's aria-label, never the tone.
    await expect(
      canvas.getByRole("link", { name: /Sắp đến hạn \(Gấp\)/ }),
    ).toBeInTheDocument();
    // Contrast: the 10px eyebrow may not use the warning text token.
    await expect(eyebrow.parentElement).not.toHaveClass(
      "text-edu-warning-text",
    );
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

/** ONE course's timeline read failed. That card degrades to a VISIBLE reason
 *  (unknown, not zero) and keeps its link; its siblings are untouched — a single
 *  bad fan-out leg must never blank the page. The reason is plain text, not a
 *  `title` tooltip on a dash: tooltips do not exist on touch (A11Y-004). */
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
    await expect(
      canvas.getByText("Không tải được danh sách mục của khoá học này."),
    ).toBeInTheDocument();
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

/**
 * QA gap-fill (US-E24.2) — AC "toàn card 44px+ target". A real Chromium
 * `getBoundingClientRect()` on the rendered card link, not a class-name guess:
 * Tailwind spacing alone does not prove the rendered box actually clears the
 * touch-target floor once real text wraps into the layout.
 */
export const TouchTarget_CardMeetsMinimum: Story = {
  args: { courses: [PHYSICS], errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("link", { name: /Vật lý 10/ });
    const rect = card.getBoundingClientRect();
    await expect(rect.height).toBeGreaterThanOrEqual(44);
    await expect(rect.width).toBeGreaterThanOrEqual(44);
  },
};

/**
 * QA gap-fill (US-E24.2) — AC "focus ring visible", proven with a REAL focus
 * + computed style, not just a static class assertion (that only proves the
 * class string is present, not that Chromium actually paints it inside the
 * Card's `overflow-hidden` clip). `ring-inset` renders the ring as an INSET
 * `box-shadow`, so — unlike an outward ring — it is never clipped by an
 * ancestor's `overflow: hidden`; this asserts the computed shadow is real
 * (not `"none"`) once the link is truly focused.
 */
export const FocusRing_VisibleWhenFocused: Story = {
  args: { courses: [MATH], errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("link", { name: /Toán 10/ });

    await expect(getComputedStyle(card).boxShadow).toBe("none");
    card.focus();
    await expect(card).toHaveFocus();
    await expect(getComputedStyle(card).boxShadow).not.toBe("none");
  },
};

/**
 * QA gap-fill (US-E24.2) — AC "tab qua grid, Enter mở link". Proves the grid
 * is reachable by keyboard ALONE (no mouse) and that the focused element is
 * genuinely the target course's link with its real navigable `href` — a
 * screen-reader/keyboard user must be able to reach and identify every card
 * in document order.
 */
export const KeyboardOperability_TabReachesEachCard: Story = {
  args: { courses: MOCK_COURSES, errorKey: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [math, physics, literature] = MOCK_COURSES.map((c) =>
      canvas.getByRole("link", { name: new RegExp(c.title.split(" —")[0]) }),
    );

    // The `?view=` pill row (US-E24.4) precedes the grid in document order —
    // tab through it first, which also proves the three pills are themselves
    // keyboard-reachable links rather than click-only affordances.
    for (const label of ["Môn học", "Bài tập", "Bài kiểm tra"]) {
      await userEvent.tab();
      await expect(canvas.getByRole("link", { name: label })).toHaveFocus();
    }

    await userEvent.tab();
    await expect(math).toHaveFocus();
    await expect(math).toHaveAttribute("href", MOCK_COURSES[0]?.href);

    await userEvent.tab();
    await expect(physics).toHaveFocus();

    await userEvent.tab();
    await expect(literature).toHaveFocus();
    // Enter on a focused `<a>` is native browser navigation (no JS handler to
    // spy on) — the behaviour under test is that keyboard focus actually
    // lands on a real link with a real destination, which the assertions
    // above already establish for all three cards in document order.
  },
};

/**
 * QA gap-fill (US-E24.2) — AC "mobile 320px không vỡ". The grid track was
 * only asserted by a code comment (`min(300px,100%)`); this renders at a real
 * 320px Chromium viewport and checks the document never grows a horizontal
 * scrollbar, using the same technique as the principal-classes 320px stories.
 */
export const Viewport320_GridDoesNotOverflow: Story = {
  args: { courses: MOCK_COURSES, errorKey: null },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(320, 900);
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Toán 10 — Đại số & Giải tích"),
    ).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(321);
  },
};
