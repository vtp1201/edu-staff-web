import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { CourseTimeline } from "./course-timeline";
import type {
  CourseTimelineVm,
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
    actions: { retryListItems },
    itemHrefBase: "/vi/t/demo/student/courses/co-toan-10/items",
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
    // Every openable row is a link into the player, in reading order.
    await expect(canvas.getAllByRole("link")).toHaveLength(4);
  },
};

/**
 * US-E24.5: a row is a LINK into `/items/[itemId]`, not an inline expander.
 * The whole row is one focus target carrying one accessible name.
 */
export const RowLinksToPlayer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole("link", { name: /Quy tắc tính đạo hàm/ });
    await expect(row).toHaveAttribute(
      "href",
      "/vi/t/demo/student/courses/co-toan-10/items/le-1",
    );
    // Nothing expands in place any more.
    await expect(canvas.queryByRole("button", { expanded: true })).toBeNull();
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
    // A closed row keeps its link: the player renders it read-only.
    await expect(
      canvas.getByRole("link", { name: /Quy tắc tính đạo hàm/ }),
    ).toHaveAttribute(
      "href",
      "/vi/t/demo/student/courses/co-toan-10/items/le-1",
    );
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
    // Not a link and not focusable: it cannot be opened by mouse OR keyboard.
    expect(title.closest("a")).toBeNull();
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

/**
 * QA gap-fill (US-E24.3) — the Storybook `viewport` global's `"mobile1"`
 * preset is 320px, not 375px (confirmed with a debug probe: `clientWidth`
 * read 320). `Mobile375` above therefore over-tests (320px is a strict
 * subset of 375px, so it doesn't invalidate the AC) but is mislabeled — see
 * QA defect list. This story does a REAL 375px resize via
 * `vitest/browser`'s `page.viewport`, matching the project convention
 * (`principal-classes-screen.stories.tsx` `Viewport375_CardList`), so the AC
 * ("mobile 375 không vỡ") has one test that is provably at exactly 375px.
 */
export const Viewport375Real: Story = {
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 800);
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Toán 10/ }),
    ).toBeInTheDocument();
    expect(canvasElement.scrollWidth).toBeLessThanOrEqual(
      canvasElement.clientWidth + 1,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(376);
  },
};

/**
 * QA gap-fill (US-E24.3 AC-7) — keyboard tab order follows DOM/reading order
 * (always-group → week ascending → position), and the locked EXAM row is
 * genuinely UNREACHABLE by keyboard (no `tabIndex`, so `Tab` skips over it
 * rather than merely being unclickable). Uses the `WithUpcomingExam` fixture
 * (adds one locked row after three open/closed rows) so the walk has
 * something to skip.
 */
export const KeyboardOperability: Story = {
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
    const rows = canvas.getAllByRole("link");
    // Reading order: "Luôn mở" (doc-1), then week-17 (le-1, as-1), week-18
    // (le-2) — the locked EXAM row is NOT among these links at all.
    expect(rows).toHaveLength(4);

    // Real Tab walk (not just a DOM-order assertion): focus starts on the
    // canvas body, then each `Tab` must land on the next row IN ORDER, and a
    // final `Tab` must NEVER land on the locked exam row.
    canvasElement.ownerDocument.body.focus();
    for (const row of rows) {
      await userEvent.tab();
      await expect(row).toHaveFocus();
    }
    await userEvent.tab();
    const lockedRow = canvas
      .getByText("Kiểm tra 1 tiết — Chương IV & V")
      .closest("[aria-disabled]");
    expect(lockedRow).not.toBeNull();
    expect(lockedRow?.contains(document.activeElement)).toBe(false);
  },
};

/**
 * QA gap-fill (US-E24.3 AC-4) — a REAL attempt to activate the locked EXAM
 * row (click, then Enter/Space while forcing focus onto it) proves nothing
 * happens, not just that the markup looks non-interactive.
 */
export const LockedRowRejectsActivation: Story = {
  args: {
    vm: {
      ...BASE_VM,
      weeks: [
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
    const lockedRow = title.closest("[aria-disabled]");
    expect(lockedRow).not.toBeNull();
    if (!lockedRow) throw new Error("expected a locked row");

    await userEvent.click(lockedRow);
    // Nothing navigable appeared and the row never became a link.
    expect(lockedRow.querySelector("a")).toBeNull();
    expect(canvas.queryByRole("link", { name: /Kiểm tra 1 tiết/ })).toBeNull();

    // Force-focus it (an AT user or a broken focus trap could still land
    // here) and try both activation keys — still nothing opens.
    (lockedRow as HTMLElement).focus?.();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(canvas.queryByRole("link", { name: /Kiểm tra 1 tiết/ })).toBeNull();
  },
};

/* ── US-E24.10: the two STAFF modes of the same component ────────────────── */

const TEACHER_VM: CourseTimelineVm = {
  ...BASE_VM,
  mode: "teacher",
  teacher: {
    orderedItemIds: WEEKS.flatMap((w) => w.items.map((i) => i.id)),
    deletableItemIds: WEEKS.flatMap((w) =>
      w.items.filter((i) => i.itemType === "DOCUMENT").map((i) => i.id),
    ),
    examBankHref: "/vi/t/demo/teacher/exam-bank",
  },
};

/** AC: kéo-thả + Sửa ngày + Thêm mục, on the same three weeks the student sees. */
export const TeacherThreeWeeks: Story = {
  args: {
    vm: TEACHER_VM,
    actions: {
      retryListItems,
      reorderItems: async () => ({ ok: true }),
      patchItemWindow: async () => ({ ok: true }),
      requestDeleteItem: () => {},
      requestAddItem: () => {},
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.courses.teacher.modeBanner),
    ).toBeVisible();
    // Same grouping as the student view — only the affordances differ.
    const headings = canvas.getAllByRole("heading", { level: 2 });
    await expect(headings[0]?.textContent).toBe("Luôn mở");
    // A teacher row is not a link: there is no teacher-side player route.
    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
    await expect(
      canvas.getAllByRole("button", { name: /^Chuyển lên:/ }),
    ).toHaveLength(4);
    // One "+ Thêm mục" pill per week group.
    await expect(
      canvas.getAllByRole("button", { name: "Thêm mục" }),
    ).toHaveLength(3);
  },
};

/** AC: GVCN on someone else's subject — no grip, no chevron, no Sửa ngày/Thêm mục. */
export const ReadonlyForOtherSubject: Story = {
  args: {
    vm: { ...TEACHER_VM, mode: "readonly" },
    actions: { retryListItems },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.courses.teacher.readonlyPill),
    ).toBeVisible();
    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
    await expect(canvas.queryByRole("button", { name: "Sửa ngày" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Thêm mục" })).toBeNull();
    await expect(
      canvas.queryByRole("button", { name: /^Chuyển lên:/ }),
    ).toBeNull();
  },
};

/**
 * AC: an EXAM's window belongs to core's exam schedule. The refusal is VISIBLE
 * text, not a hover tooltip, and the control is disabled rather than failing on
 * submit.
 */
export const TeacherExamRowLocked: Story = {
  args: {
    vm: {
      ...TEACHER_VM,
      weeks: [
        {
          key: "2026-W19",
          weekStart: "2026-05-04",
          weekEnd: "2026-05-10",
          items: [EXAM_UPCOMING],
        },
      ],
      teacher: {
        orderedItemIds: [EXAM_UPCOMING.id],
        deletableItemIds: [],
        examBankHref: "/vi/t/demo/teacher/exam-bank",
      },
    },
    actions: {
      retryListItems,
      reorderItems: async () => ({ ok: true }),
      patchItemWindow: async () => ({ ok: true }),
      requestAddItem: () => {},
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editButton = canvas.getByRole("button", { name: "Sửa ngày" });
    await expect(editButton).toBeDisabled();
    await expect(
      canvas.getByText(messages.courses.errors["exam-window-not-editable"]),
    ).toBeVisible();
    // An EXAM tile has no delete affordance either (BE 409).
    await expect(
      canvas.queryByRole("button", { name: /^Xoá tài liệu:/ }),
    ).toBeNull();
  },
};

/** AC: the add menu is a real `menu`/`menuitem`, and "Kiểm tra" navigates. */
export const TeacherAddMenu: Story = {
  args: {
    vm: TEACHER_VM,
    actions: {
      retryListItems,
      reorderItems: async () => ({ ok: true }),
      patchItemWindow: async () => ({ ok: true }),
      requestAddItem: () => {},
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pill = canvas.getAllByRole("button", { name: "Thêm mục" })[0];
    if (!pill) throw new Error("no add-item pill rendered");
    await userEvent.click(pill);

    // Radix portals the content, so it is queried from the document body.
    const menu = await within(document.body).findByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    await expect(items).toHaveLength(4);
    await expect(items[0]).toHaveTextContent("Bài giảng");
    // "Kiểm tra" NAVIGATES to the exam bank instead of creating anything
    // (ask #6). `asChild` merges the anchor INTO the menuitem, so the href sits
    // on the menuitem itself — which is what keeps it in the roving focus set
    // rather than being a bare anchor nested inside a menu.
    const exam = items[3];
    if (!exam) throw new Error("no exam entry");
    await expect(exam).toHaveAttribute("href", "/vi/t/demo/teacher/exam-bank");
    await expect(exam).toHaveTextContent(
      messages.courses.teacher.addMenu.examNote,
    );
  },
};

/** AC: keyboard reorder sends the COMPLETE new ordering, same as a drop. */
export const TeacherKeyboardReorder: Story = {
  args: {
    vm: TEACHER_VM,
    actions: {
      retryListItems,
      reorderItems: fn(async () => ({ ok: true as const })),
      patchItemWindow: async () => ({ ok: true }),
      requestAddItem: () => {},
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const spy = args.actions.reorderItems;
    const ids = TEACHER_VM.teacher?.orderedItemIds ?? [];
    const down = canvas.getAllByRole("button", { name: /^Chuyển xuống:/ })[0];
    if (!down) throw new Error("no reorder control rendered");

    await userEvent.click(down);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    // The COMPLETE ordering, never a delta — a partial list is a BE 404 that
    // writes nothing. The first two rows are swapped, the rest untouched.
    await expect(spy).toHaveBeenCalledWith([ids[1], ids[0], ...ids.slice(2)]);
  },
};

/** AC: the first row cannot move up and the last cannot move down. */
export const TeacherReorderEdges: Story = {
  args: {
    vm: TEACHER_VM,
    actions: {
      retryListItems,
      reorderItems: async () => ({ ok: true }),
      patchItemWindow: async () => ({ ok: true }),
      requestAddItem: () => {},
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ups = canvas.getAllByRole("button", { name: /^Chuyển lên:/ });
    const downs = canvas.getAllByRole("button", { name: /^Chuyển xuống:/ });
    await expect(ups[0]).toBeDisabled();
    await expect(downs[downs.length - 1]).toBeDisabled();
    await expect(ups[1]).toBeEnabled();
  },
};
