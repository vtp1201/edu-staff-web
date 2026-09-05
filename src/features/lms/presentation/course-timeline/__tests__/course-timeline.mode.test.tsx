import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { CourseTimeline } from "../course-timeline";
import type {
  CourseTimelineActions,
  CourseTimelineMode,
  CourseTimelineVm,
  TimelineItemVm,
} from "../course-timeline.i-vm";

/**
 * The `mode` contract. US-E24.3 declared all three and threw for two; US-E24.10
 * makes `teacher`/`readonly` real, so what matters now is that the three modes
 * differ in exactly the ways the packet says — mostly by what is ABSENT, which
 * is the half a screenshot never proves.
 *
 * Node-env render check: the repo has no `@testing-library/react`, so this
 * asserts static markup. Interaction (drag, keyboard reorder, menus) is proven
 * by the Storybook play functions.
 */
const ITEM: TimelineItemVm = {
  id: "i1",
  itemType: "LESSON",
  title: "Bài giảng: Đạo hàm",
  state: "OPEN",
  startAt: "2026-04-20T07:00:00.000Z",
  dueAt: null,
  description: null,
  url: null,
  examUrl: null,
  examDurationMinutes: null,
  locked: false,
  opensAt: null,
};

const DOC: TimelineItemVm = {
  ...ITEM,
  id: "i2",
  itemType: "DOCUMENT",
  title: "Tài liệu: Bảng công thức",
  url: "https://example.edu.vn/x.pdf",
};

function vm(mode: CourseTimelineMode): CourseTimelineVm {
  return {
    courseId: "c1",
    courseName: "Toán 10",
    tone: "primary",
    openCount: 1,
    weeks: [
      {
        key: "2026-W17",
        weekStart: "2026-04-20",
        weekEnd: "2026-04-26",
        items: [ITEM, DOC],
      },
    ],
    errorKey: null,
    mode,
    ...(mode === "student"
      ? {}
      : {
          teacher: {
            orderedItemIds: [ITEM.id, DOC.id],
            deletableItemIds: [DOC.id],
            examBankHref: "/vi/t/demo/teacher/exam-bank",
          },
        }),
  };
}

const READ_ONLY_ACTIONS: CourseTimelineActions = {
  retryListItems: vi.fn(),
};

const TEACHER_ACTIONS: CourseTimelineActions = {
  retryListItems: vi.fn(),
  reorderItems: vi.fn(),
  patchItemWindow: vi.fn(),
  requestDeleteItem: vi.fn(),
  requestAddItem: vi.fn(),
};

function renderVm(
  timelineVm: CourseTimelineVm,
  actions: CourseTimelineActions,
): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      <CourseTimeline
        vm={timelineVm}
        actions={actions}
        itemHrefBase="/vi/t/demo/student/courses/c1/items"
      />
    </NextIntlClientProvider>,
  );
}

const render = (mode: CourseTimelineMode, actions: CourseTimelineActions) =>
  renderVm(vm(mode), actions);

describe("CourseTimeline — mode branches (US-E24.10)", () => {
  it("keeps student rows as links into the player, with no teacher affordance", () => {
    const html = render("student", READ_ONLY_ACTIONS);

    expect(html).toContain('href="/vi/t/demo/student/courses/c1/items/i1"');
    expect(html).not.toContain(messages.courses.teacher.editDates.label);
    expect(html).not.toContain(messages.courses.teacher.addMenu.label);
    expect(html).not.toContain(messages.courses.teacher.modeBanner);
    expect(html).not.toContain('draggable="true"');
  });

  it("gives read-only NO grip, NO link, NO date edit and NO add menu", () => {
    const html = render("readonly", READ_ONLY_ACTIONS);

    expect(html).toContain(messages.courses.teacher.readonlyPill);
    expect(html).not.toContain("/student/courses/c1/items/i1");
    expect(html).not.toContain(messages.courses.teacher.editDates.label);
    expect(html).not.toContain(messages.courses.teacher.addMenu.label);
    expect(html).not.toContain('draggable="true"');
  });

  it("gives teacher the reorder handles, the date editor and the add menu", () => {
    const html = render("teacher", TEACHER_ACTIONS);

    expect(html).toContain(messages.courses.teacher.modeBanner);
    expect(html).toContain(messages.courses.teacher.editDates.label);
    expect(html).toContain(messages.courses.teacher.addMenu.label);
    expect(html).toContain('draggable="true"');
    // Reorder must be keyboard-operable, not drag-only.
    expect(html).toContain("Chuyển lên: Bài giảng: Đạo hàm");
    expect(html).toContain("Chuyển xuống: Bài giảng: Đạo hàm");
  });

  it("offers delete for a DOCUMENT row only — a lesson tile has no delete route", () => {
    const html = render("teacher", TEACHER_ACTIONS);

    expect(html).toContain("Xoá tài liệu: Tài liệu: Bảng công thức");
    expect(html).not.toContain("Xoá tài liệu: Bài giảng: Đạo hàm");
  });

  it("disables reorder at the edges rather than offering an impossible move", () => {
    const html = render("teacher", TEACHER_ACTIONS);
    const firstUp = html.indexOf("Chuyển lên: Bài giảng: Đạo hàm");

    expect(firstUp).toBeGreaterThan(-1);
    // `disabled` sits on the same <button> element, just before its aria-label.
    expect(html.slice(Math.max(0, firstUp - 250), firstUp)).toContain(
      "disabled",
    );
  });

  it("mounts the add menu in the EMPTY state too — where it matters most", () => {
    const html = renderVm(
      { ...vm("teacher"), weeks: [], openCount: 0 },
      TEACHER_ACTIONS,
    );

    expect(html).toContain(messages.courses.timeline.emptyTitle);
    expect(html).toContain(messages.courses.teacher.addMenu.label);
  });

  it("still degrades the timeline read independently of the course read", () => {
    const html = renderVm(
      { ...vm("teacher"), errorKey: "network-error" },
      TEACHER_ACTIONS,
    );

    expect(html).toContain(messages.courses.errors["network-error"]);
    expect(html).toContain(messages.courses.timeline.retry);
    // The header is still there — a failed item read is not a failed course.
    expect(html).toContain("Toán 10");
  });
});

describe("EXAM rows", () => {
  it("refuse the window edit in VISIBLE text, never a hover tooltip", () => {
    const html = renderVm(
      {
        ...vm("teacher"),
        weeks: [
          {
            key: "2026-W17",
            weekStart: "2026-04-20",
            weekEnd: "2026-04-26",
            items: [{ ...ITEM, id: "ex1", itemType: "EXAM", title: "KT 15p" }],
          },
        ],
      },
      TEACHER_ACTIONS,
    );

    expect(html).toContain(messages.courses.errors["exam-window-not-editable"]);
    expect(html).not.toContain("title=");
  });
});
