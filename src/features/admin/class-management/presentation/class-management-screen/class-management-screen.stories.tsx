import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { TeacherMember } from "@/features/admin/class-management/domain/entities/teacher-member.entity";
import { ClassManagementScreen } from "./class-management-screen";
import type { ClassActionResult } from "./class-management-screen.i-vm";

const teachers: TeacherMember[] = [
  { userId: "u-1", displayName: "Nguyễn Thị Lan", email: "lan@edu.example" },
  { userId: "u-2", displayName: "Trần Văn Minh", email: "minh@edu.example" },
  { userId: "u-3", displayName: "Lê Hoàng Phúc", email: "phuc@edu.example" },
];

const mkClass = (over: Partial<Class>): Class => ({
  id: "c-1",
  name: "10A1",
  gradeLevel: 10,
  status: "ACTIVE",
  academicYear: "2025-2026",
  studentCount: 0,
  homeroomTeacherId: null,
  homeroomTeacherName: null,
  ...over,
});

const okResult = async (): Promise<ClassActionResult> => ({ ok: true });
const okWithClass = async (): Promise<ClassActionResult> => ({
  ok: true,
  data: mkClass({ id: `c-${Date.now()}`, name: "New" }),
});

const handlers = {
  onCreateClass: okWithClass,
  onRenameClass: async () => ({ ok: true, data: mkClass({}) }),
  onArchiveClass: okResult,
  onAssignHomeroom: okResult,
  onListTeachers: async () => ({ ok: true, data: teachers }),
};

const failResult = async (): Promise<ClassActionResult> => ({
  ok: false,
  errorKey: "network-error",
});

const failingHandlers = {
  onCreateClass: failResult,
  onRenameClass: failResult,
  onArchiveClass: failResult,
  onAssignHomeroom: failResult,
  onListTeachers: async () => ({
    ok: false as const,
    errorKey: "network-error" as const,
  }),
};

const meta: Meta<typeof ClassManagementScreen> = {
  title: "Admin/ClassManagement/ClassManagementScreen",
  component: ClassManagementScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ClassManagementScreen>;

export const Empty: Story = {
  args: {
    vm: {
      classes: [],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
};

export const Populated: Story = {
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-10a1",
          name: "10A1",
          gradeLevel: 10,
          studentCount: 32,
          homeroomTeacherId: "u-1",
          homeroomTeacherName: "Nguyễn Thị Lan",
        }),
        mkClass({
          id: "c-10a2",
          name: "10A2",
          gradeLevel: 10,
          studentCount: 0,
        }),
        mkClass({
          id: "c-12c1",
          name: "12C1",
          gradeLevel: 12,
          status: "ARCHIVED",
          academicYear: "2024-2025",
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
};

export const WithHomeroomAssigned: Story = {
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-11b1",
          name: "11B1",
          gradeLevel: 11,
          studentCount: 28,
          homeroomTeacherId: "u-2",
          homeroomTeacherName: "Trần Văn Minh",
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
};

/**
 * Error state: every mutation fails (e.g. backend/network down). The screen
 * surfaces the failure via an error toast and keeps the existing rows intact so
 * the admin can retry.
 */
export const ActionError: Story = {
  name: "Error",
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-err",
          name: "10A1",
          gradeLevel: 10,
          studentCount: 32,
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...failingHandlers,
  },
};

export const ArchiveWithWarning: Story = {
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-busy",
          name: "10A9",
          gradeLevel: 10,
          studentCount: 40,
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
};

// ---------------------------------------------------------------------------
// Interaction play stories — QA US-E12.10
// ---------------------------------------------------------------------------

/**
 * TC-INT-01 · AC-2 · CreateClass happy path
 *
 * Opens the CreateClassSheet, fills name + year, selects a grade, submits, and
 * verifies the success toast appears ("Tạo lớp thành công.").
 */
export const CreateClassHappyPath: Story = {
  name: "Interaction / CreateClass happy path (TC-INT-01)",
  args: {
    vm: {
      classes: [],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("open CreateClass sheet", async () => {
      const createBtn = canvas.getByRole("button", { name: /tạo lớp mới/i });
      await userEvent.click(createBtn);
    });

    await step("fill class name", async () => {
      const nameInput = body.getByPlaceholderText(/ví dụ: 10a1/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "10A3");
    });

    await step("fill academic year", async () => {
      const yearInput = body.getByPlaceholderText(/ví dụ: 2025-2026/i);
      await userEvent.clear(yearInput);
      await userEvent.type(yearInput, "2025-2026");
    });

    await step("submit form", async () => {
      const submitBtn = body.getByRole("button", { name: /tạo lớp/i });
      await userEvent.click(submitBtn);
    });

    await step("success toast appears", async () => {
      // Toast rendered by sonner outside the canvas — search in document body
      const toast = await body.findByText("Tạo lớp thành công.");
      expect(toast).toBeInTheDocument();
    });
  },
};

/**
 * TC-INT-02 · AC-2 · CreateClass validation — name required
 *
 * Submits the CreateClassSheet with an empty name and verifies the inline
 * validation error message is shown.
 */
export const CreateClassNameRequired: Story = {
  name: "Interaction / CreateClass name required (TC-INT-02)",
  args: {
    vm: {
      classes: [],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("open sheet", async () => {
      await userEvent.click(
        canvas.getByRole("button", { name: /tạo lớp mới/i }),
      );
    });

    await step("fill year but leave name empty", async () => {
      const yearInput = body.getByPlaceholderText(/ví dụ: 2025-2026/i);
      await userEvent.type(yearInput, "2025-2026");
    });

    await step("submit without name", async () => {
      await userEvent.click(body.getByRole("button", { name: /tạo lớp/i }));
    });

    await step("inline name-required error is visible", async () => {
      const errorMsg = await body.findByRole("alert");
      expect(errorMsg).toHaveTextContent(/vui lòng nhập tên lớp/i);
    });
  },
};

/**
 * TC-INT-03 · AC-4 · ArchiveWithWarning flow
 *
 * Clicks Archive on a class with studentCount > 0, verifies the warning text
 * contains the student count, then confirms to archive.
 */
export const ArchiveWithWarningFlow: Story = {
  name: "Interaction / Archive with student-count warning (TC-INT-03)",
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-busy",
          name: "10A9",
          gradeLevel: 10,
          studentCount: 40,
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("click Archive action for 10A9", async () => {
      const archiveBtn = canvas.getByRole("button", { name: /lưu trữ/i });
      await userEvent.click(archiveBtn);
    });

    await step("dialog opens and shows warning with count", async () => {
      // Warning paragraph rendered inside AlertDialogContent (portalled to body)
      const warning = await body.findByText(/lớp này đang có 40 học sinh/i);
      expect(warning).toBeInTheDocument();
    });

    await step("confirm archive", async () => {
      // The confirm button inside the AlertDialog footer
      const confirmBtn = body.getByRole("button", { name: /lưu trữ/i });
      await userEvent.click(confirmBtn);
    });

    await step("success toast appears", async () => {
      const toast = await body.findByText("Lưu trữ lớp thành công.");
      expect(toast).toBeInTheDocument();
    });
  },
};

/**
 * TC-INT-04 · AC-3 · Rename happy path
 *
 * Clicks Rename on the first class, verifies the sheet opens with the current
 * name pre-filled, changes the name, submits, and verifies the success toast.
 */
export const RenameHappyPath: Story = {
  name: "Interaction / Rename class happy path (TC-INT-04)",
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-10a1",
          name: "10A1",
          gradeLevel: 10,
          studentCount: 0,
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("click Rename action", async () => {
      const renameBtn = canvas.getByRole("button", { name: /đổi tên/i });
      await userEvent.click(renameBtn);
    });

    await step("sheet opens with pre-filled class name", async () => {
      const nameInput = await body.findByDisplayValue("10A1");
      expect(nameInput).toBeInTheDocument();
    });

    await step("update class name", async () => {
      const nameInput = body.getByDisplayValue("10A1");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "10A1-Updated");
    });

    await step("submit rename", async () => {
      const submitBtn = body.getByRole("button", { name: /lưu thay đổi/i });
      await userEvent.click(submitBtn);
    });

    await step("success toast appears", async () => {
      const toast = await body.findByText("Đổi tên lớp thành công.");
      expect(toast).toBeInTheDocument();
    });
  },
};

/**
 * TC-INT-05 · AC-5 · Assign homeroom teacher
 *
 * Opens the homeroom picker for a class with no current GVCN, searches for a
 * teacher by name, selects them, and verifies the success toast.
 */
export const AssignHomeroomFlow: Story = {
  name: "Interaction / Assign homeroom teacher (TC-INT-05)",
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-11b2",
          name: "11B2",
          gradeLevel: 11,
          studentCount: 20,
          homeroomTeacherId: null,
          homeroomTeacherName: null,
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("click Assign GVCN action", async () => {
      const assignBtn = canvas.getByRole("button", { name: /gán gvcn/i });
      await userEvent.click(assignBtn);
    });

    await step("homeroom picker sheet opens", async () => {
      const sheetTitle = await body.findByText("Gán giáo viên chủ nhiệm");
      expect(sheetTitle).toBeInTheDocument();
    });

    await step("search for teacher by name", async () => {
      const searchInput = body.getByPlaceholderText(/tìm giáo viên theo tên/i);
      await userEvent.type(searchInput, "Lan");
    });

    await step("select matching teacher", async () => {
      const lanBtn = await body.findByRole("button", {
        name: /nguyễn thị lan/i,
      });
      await userEvent.click(lanBtn);
    });

    await step("success toast appears", async () => {
      const toast = await body.findByText(
        "Phân công giáo viên chủ nhiệm thành công.",
      );
      expect(toast).toBeInTheDocument();
    });
  },
};

/**
 * TC-INT-06 · AC-7 · Empty state
 *
 * Verifies the "no classes" empty state message is rendered when the class list
 * is empty.
 */
export const EmptyStateVerified: Story = {
  name: "Interaction / Empty state message (TC-INT-06)",
  args: {
    vm: {
      classes: [],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("empty state message is visible", async () => {
      const emptyMsg = await canvas.findByText("Chưa có lớp học nào.");
      expect(emptyMsg).toBeInTheDocument();
    });
  },
};

/**
 * TC-INT-07 · AC-2 · Duplicate class — 409 inline error
 *
 * Submits CreateClass; the handler returns a duplicate-class error; verifies
 * the error toast with the i18n message "Lớp đã tồn tại trong năm học này."
 */
export const CreateClassDuplicateError: Story = {
  name: "Interaction / CreateClass duplicate-class error (TC-INT-07)",
  args: {
    vm: {
      classes: [],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    onCreateClass: async (): Promise<ClassActionResult> => ({
      ok: false,
      errorKey: "duplicate-class",
    }),
    onRenameClass: handlers.onRenameClass,
    onArchiveClass: handlers.onArchiveClass,
    onAssignHomeroom: handlers.onAssignHomeroom,
    onListTeachers: handlers.onListTeachers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("open sheet and fill valid data", async () => {
      await userEvent.click(
        canvas.getByRole("button", { name: /tạo lớp mới/i }),
      );
      const nameInput = body.getByPlaceholderText(/ví dụ: 10a1/i);
      await userEvent.type(nameInput, "10A1");
      const yearInput = body.getByPlaceholderText(/ví dụ: 2025-2026/i);
      await userEvent.type(yearInput, "2025-2026");
    });

    await step("submit", async () => {
      await userEvent.click(body.getByRole("button", { name: /tạo lớp/i }));
    });

    await step("duplicate error toast appears", async () => {
      const toast = await body.findByText("Lớp đã tồn tại trong năm học này.");
      expect(toast).toBeInTheDocument();
    });
  },
};

/**
 * TC-INT-08 · AC-6 · Grade level out of range — 422 toast
 *
 * Handler returns grade-level-out-of-range; verifies the error toast with the
 * i18n message pointing the admin to School Setup.
 */
export const CreateClassGradeOutOfRange: Story = {
  name: "Interaction / CreateClass grade-level-out-of-range toast (TC-INT-08)",
  args: {
    vm: {
      classes: [],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    onCreateClass: async (): Promise<ClassActionResult> => ({
      ok: false,
      errorKey: "grade-level-out-of-range",
    }),
    onRenameClass: handlers.onRenameClass,
    onArchiveClass: handlers.onArchiveClass,
    onAssignHomeroom: handlers.onAssignHomeroom,
    onListTeachers: handlers.onListTeachers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("open sheet and fill data", async () => {
      await userEvent.click(
        canvas.getByRole("button", { name: /tạo lớp mới/i }),
      );
      const nameInput = body.getByPlaceholderText(/ví dụ: 10a1/i);
      await userEvent.type(nameInput, "6A1");
      const yearInput = body.getByPlaceholderText(/ví dụ: 2025-2026/i);
      await userEvent.type(yearInput, "2025-2026");
    });

    await step("submit", async () => {
      await userEvent.click(body.getByRole("button", { name: /tạo lớp/i }));
    });

    await step(
      "out-of-range error toast appears with school-setup hint",
      async () => {
        const toast = await body.findByText(
          /khối lớp nằm ngoài phạm vi.*thiết lập trường học/i,
        );
        expect(toast).toBeInTheDocument();
      },
    );
  },
};

/**
 * TC-INT-09 · AC-5 · Homeroom picker shows current GVCN
 *
 * Opens the homeroom picker for a class with a pre-assigned GVCN. Verifies the
 * "current homeroom" label and teacher name are displayed.
 */
export const HomeroomPickerShowsCurrent: Story = {
  name: "Interaction / Homeroom picker shows current GVCN (TC-INT-09)",
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-11b1",
          name: "11B1",
          gradeLevel: 11,
          studentCount: 28,
          homeroomTeacherId: "u-2",
          homeroomTeacherName: "Trần Văn Minh",
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("click Assign GVCN action", async () => {
      const assignBtn = canvas.getByRole("button", { name: /gán gvcn/i });
      await userEvent.click(assignBtn);
    });

    await step("current GVCN label and name are displayed", async () => {
      const currentLabel = await body.findByText(/gvcn hiện tại/i);
      expect(currentLabel).toBeInTheDocument();
      const teacherName = body.getByText("Trần Văn Minh");
      expect(teacherName).toBeInTheDocument();
    });
  },
};

/**
 * TC-INT-10 · AC-1 · Year filter
 *
 * Types a year into the filter and verifies only matching rows remain visible.
 */
export const YearFilterFiltersRows: Story = {
  name: "Interaction / Year filter hides non-matching rows (TC-INT-10)",
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-a",
          name: "10A1",
          gradeLevel: 10,
          academicYear: "2025-2026",
          studentCount: 0,
        }),
        mkClass({
          id: "c-b",
          name: "12C1",
          gradeLevel: 12,
          academicYear: "2024-2025",
          studentCount: 0,
          status: "ARCHIVED",
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("both rows start visible", async () => {
      expect(canvas.getByText("10A1")).toBeInTheDocument();
      expect(canvas.getByText("12C1")).toBeInTheDocument();
    });

    await step("type a year filter", async () => {
      const yearInput = canvas.getByPlaceholderText("2025-2026");
      await userEvent.type(yearInput, "2025-2026");
    });

    await step("only the matching row remains", async () => {
      expect(canvas.getByText("10A1")).toBeInTheDocument();
      expect(canvas.queryByText("12C1")).not.toBeInTheDocument();
    });
  },
};
