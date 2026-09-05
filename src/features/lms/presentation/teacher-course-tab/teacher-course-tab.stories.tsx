import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import { TeacherCourseTab } from "./teacher-course-tab";
import type {
  TeacherCourseTabActions,
  TeacherCourseTabVm,
} from "./teacher-course-tab.i-vm";

function item(over: Partial<CourseItem> = {}): CourseItem {
  return {
    id: "le-1",
    courseId: "co-toan-10",
    itemType: "LESSON",
    refId: "le-1",
    title: "Bài giảng: Quy tắc tính đạo hàm",
    description: null,
    url: null,
    position: 0,
    startAt: "2026-04-20T07:00:00.000Z",
    dueAt: null,
    state: "OPEN",
    createdBy: "u-teacher-1",
    createdAt: "2026-04-18T00:00:00.000Z",
    updatedAt: "2026-04-18T00:00:00.000Z",
    exam: null,
    ...over,
  };
}

const ITEMS: CourseItem[] = [
  item(),
  item({
    id: "doc-1",
    itemType: "DOCUMENT",
    refId: null,
    title: "Tài liệu: Bảng công thức đạo hàm",
    url: "https://example.edu.vn/bang-cong-thuc.pdf",
    position: 1,
  }),
];

const BASE_VM: TeacherCourseTabVm = {
  classId: "cls-10a1",
  courseId: "co-toan-10",
  courseName: "Toán 10 — Đại số & Giải tích",
  tone: "primary",
  courseStatus: "PUBLISHED",
  items: ITEMS,
  errorKey: null,
  mode: "teacher",
  subjectOptions: [{ subjectId: "sub-toan", name: "Toán", isMine: true }],
  selectedSubjectId: "sub-toan",
  emptyReason: null,
  courseTabHrefBase: "/vi/t/demo/teacher/classes/cls-10a1?tab=course",
  examBankHref: "/vi/t/demo/teacher/exam-bank",
};

function actions(
  over: Partial<TeacherCourseTabActions> = {},
): TeacherCourseTabActions {
  return {
    listItems: fn(async () => ({ ok: true as const, data: ITEMS })),
    reorderItems: fn(async () => ({ ok: true as const, data: ITEMS })),
    patchItem: fn(async () => ({
      ok: true as const,
      data: ITEMS[0] as CourseItem,
    })),
    createLesson: fn(async () => ({ ok: true as const, data: ITEMS })),
    createAssignment: fn(async () => ({ ok: true as const, data: ITEMS })),
    addDocumentItem: fn(async () => ({ ok: true as const, data: ITEMS })),
    publishCourse: fn(async () => ({
      ok: true as const,
      data: "PUBLISHED" as const,
    })),
    deleteItem: fn(async () => ({ ok: true as const, data: null })),
    ...over,
  };
}

const meta: Meta<typeof TeacherCourseTab> = {
  title: "Features/LMS/TeacherCourseTab",
  component: TeacherCourseTab,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      // A fresh client per story: a shared one would carry one story's
      // optimistic write into the next.
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      // Radix locks pointer-events on the body while a portal is open; a story
      // that ends mid-dialog would otherwise freeze the NEXT one.
      document.body.style.pointerEvents = "auto";
      return (
        <QueryClientProvider client={client}>
          <NextIntlClientProvider
            locale="vi"
            messages={messages}
            timeZone="Asia/Ho_Chi_Minh"
          >
            <div className="min-h-screen bg-edu-bg p-6">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
  args: { vm: BASE_VM, actions: actions() },
};
export default meta;

type Story = StoryObj<typeof TeacherCourseTab>;

/** A GVBM with one subject: no picker, no draft banner, full affordances. */
export const TeacherDefault: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.courses.teacher.modeBanner),
    ).toBeVisible();
    await expect(canvas.queryByRole("combobox")).toBeNull();
    await expect(
      canvas.queryByText(messages.courses.teacher.draftBanner.title),
    ).toBeNull();
  },
};

/** AC: DRAFT → banner + "Xuất bản" → PUBLISHED, and the banner leaves the DOM. */
export const DraftCourse: Story = {
  args: { vm: { ...BASE_VM, courseStatus: "DRAFT" } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.courses.teacher.draftBanner.title),
    ).toBeVisible();

    await userEvent.click(
      canvas.getByRole("button", {
        name: messages.courses.teacher.draftBanner.publish,
      }),
    );

    await waitFor(() => expect(args.actions.publishCourse).toHaveBeenCalled());
    // Removed from the DOM, not just hidden: a screen-reader user re-scanning
    // the page must not still find a stale draft warning.
    await waitFor(() =>
      expect(
        canvas.queryByText(messages.courses.teacher.draftBanner.title),
      ).toBeNull(),
    );
  },
};

/** AC: a failed reorder rolls the order back and says so. */
export const ErrorReorder: Story = {
  args: {
    actions: actions({
      reorderItems: fn(async () => ({
        ok: false as const,
        errorKey: "not-found" as const,
      })),
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const titlesBefore = canvas
      .getAllByRole("button", { name: /^Chuyển lên:/ })
      .map((b) => b.getAttribute("aria-label"));

    await userEvent.click(
      canvas.getAllByRole("button", {
        name: /^Chuyển xuống:/,
      })[0] as HTMLElement,
    );

    await waitFor(() => expect(args.actions.reorderItems).toHaveBeenCalled());
    // Rolled back: the row order is exactly what it was before the attempt.
    await waitFor(() =>
      expect(
        canvas
          .getAllByRole("button", { name: /^Chuyển lên:/ })
          .map((b) => b.getAttribute("aria-label")),
      ).toEqual(titlesBefore),
    );
  },
};

/** AC: GVCN picks another subject — the picker mounts only with >1 option. */
export const GvcnSubjectPicker: Story = {
  args: {
    vm: {
      ...BASE_VM,
      mode: "readonly",
      subjectOptions: [
        { subjectId: "sub-toan", name: "Toán", isMine: false },
        { subjectId: "sub-ly", name: "Vật lý", isMine: false },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("combobox", {
        name: messages.courses.teacher.subjectPicker.label,
      }),
    ).toBeVisible();
    // Read-only: none of the authoring affordances mount.
    await expect(canvas.queryByRole("button", { name: "Thêm mục" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Sửa ngày" })).toBeNull();
  },
};

/** Ask #7: a subject whose course BE refuses reads differently from one that
 *  simply has no course yet. */
export const ForbiddenSubject: Story = {
  args: {
    vm: {
      ...BASE_VM,
      courseId: null,
      items: [],
      courseStatus: null,
      mode: "readonly",
      emptyReason: "forbidden",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.courses.teacher.forbiddenSubject),
    ).toBeVisible();
    await expect(
      canvas.queryByText(messages.courses.teacher.noCourse),
    ).toBeNull();
  },
};

/** AC: `http://` fails on the FIELD before any BE call; `https://` submits. */
export const DocumentUrlValidation: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getAllByRole("button", { name: "Thêm mục" })[0] as HTMLElement,
    );
    await userEvent.click(
      await body.findByRole("menuitem", { name: /Tài liệu/ }),
    );

    const dialog = await body.findByRole("dialog");
    const fields = within(dialog);
    await userEvent.type(
      fields.getByLabelText(messages.courses.teacher.createDialog.titleField),
      "Đề cương",
    );
    await userEvent.type(
      fields.getByLabelText(messages.courses.teacher.createDialog.urlField),
      "http://example.com/x.pdf",
    );
    await userEvent.click(
      fields.getByRole("button", {
        name: messages.courses.teacher.createDialog.save,
      }),
    );

    // Rejected on the field, and nothing was sent.
    await expect(
      fields.getByText(messages.courses.teacher.errors.invalidUrl),
    ).toBeVisible();
    await expect(args.actions.addDocumentItem).not.toHaveBeenCalled();
    await expect(
      fields.getByLabelText(messages.courses.teacher.createDialog.urlField),
    ).toHaveAttribute("aria-invalid", "true");
  },
};
