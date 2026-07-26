import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type { Subject } from "../../domain/entities/subject.entity";
import { SubjectDetailScreen } from "./subject-detail-screen";

const subject: Subject = {
  id: "sub-math-10",
  parentId: "sp-math",
  name: "Toán lớp 10",
  code: "MATH10",
  gradeLevel: 10,
  status: "ACTIVE",
  inUse: false,
  periodCount: 105,
  requiredAssessmentCount: 4,
  outcomeTargets: "Nắm vững đại số tuyến tính",
  masterSyllabus: "https://syllabus.example/math10",
  exerciseBankRef: "EX-M10",
  examBankRef: "EXAM-M10",
};

const offerings: ClassSubject[] = [
  {
    id: "cs-1",
    className: "Lớp 10A1",
    academicYear: "2025–2026",
    teacherName: "Nguyễn Thị Hương",
    studentCount: 42,
  },
  {
    id: "cs-2",
    className: "Lớp 10A2",
    academicYear: "2025–2026",
    teacherName: "Trần Văn Nam",
    studentCount: 39,
  },
];

const meta: Meta<typeof SubjectDetailScreen> = {
  title: "Admin/SubjectCatalogue/SubjectDetailScreen",
  component: SubjectDetailScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    subject,
    parentName: "Bộ môn Toán",
    classOfferings: offerings,
    backHref: "/vi/t/thpt-a/admin/subjects",
    onSave: async (_id, data) => ({
      ok: true as const,
      subject: { ...subject, ...data } as Subject,
    }),
    onArchive: async () => ({ ok: true as const }),
  },
};
export default meta;
type Story = StoryObj<typeof SubjectDetailScreen>;

/** AC-1: full-page editor with breadcrumb, fields and the usage rail. */
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole("heading", { level: 1, name: "Toán lớp 10" }),
    ).toBeVisible();
    // Breadcrumb back to the catalogue (AC-5).
    const nav = c.getByRole("navigation", { name: "Vị trí hiện tại" });
    await expect(
      within(nav).getByRole("link", { name: "Danh mục môn học" }),
    ).toHaveAttribute("href", "/vi/t/thpt-a/admin/subjects");
    await expect(within(nav).getByText("Bộ môn Toán")).toBeVisible();
    // Shared editor body is seeded from the entity.
    await expect(c.getByLabelText("Tên môn học")).toHaveValue("Toán lớp 10");
    // Usage rail replaces the Sheet's flat offerings table.
    const usage = c.getByRole("region", {
      name: "Sử dụng trong năm học hiện tại",
    });
    await expect(within(usage).getByText("Lớp 10A1")).toBeVisible();
    await expect(within(usage).getAllByRole("listitem")).toHaveLength(2);
  },
};

/** Empty state of the usage rail. */
export const EmptyOfferings: Story = {
  args: { classOfferings: [] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Chưa được sử dụng")).toBeVisible();
    await expect(c.queryByRole("listitem")).toBeNull();
  },
};

/** AC-3: unknown id (or another tenant's) renders an inline not-found. */
export const NotFound: Story = {
  args: { subject: null, parentName: "", classOfferings: [] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole("heading", { name: "Không tìm thấy môn học" }),
    ).toBeVisible();
    await expect(
      c.getByRole("link", { name: "Về danh mục môn học" }),
    ).toHaveAttribute("href", "/vi/t/thpt-a/admin/subjects");
    // No editor surface leaks through.
    await expect(c.queryByLabelText("Tên môn học")).toBeNull();
  },
};

/** AC-4: in-use subject blocks archiving, keyboard-reachable reason. */
export const ArchiveBlocked: Story = {
  args: { subject: { ...subject, inUse: true } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const btn = c.getByRole("button", { name: "Lưu trữ" });
    await expect(btn).toHaveAttribute("aria-disabled", "true");
    // Focusable (not `disabled`) so the tooltip reason is reachable.
    btn.focus();
    await expect(btn).toHaveFocus();
    await userEvent.click(btn);
    await expect(
      c.queryByRole("alertdialog", { name: "Lưu trữ môn học?" }),
    ).toBeNull();
  },
};

/** AC-4: archive confirm round-trip flips the status badge. */
export const ArchiveConfirmed: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Lưu trữ" }));
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Lưu trữ" }),
    );
    await waitFor(async () => {
      await expect(c.getByText("Lưu trữ")).toBeVisible();
    });
    // Archive affordance is gone once archived.
    await expect(c.queryByRole("button", { name: "Lưu trữ" })).toBeNull();
  },
};

/**
 * An already-archived subject is READ-ONLY: every editor field is disabled and
 * the save bar is gone (design reference `design_src/edu/subject-detail.jsx`
 * `isArchived`). Guards against editing a record that is out of service.
 */
export const ArchivedReadOnly: Story = {
  args: { subject: { ...subject, status: "ARCHIVED" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Tên môn học")).toBeDisabled();
    await expect(c.getByLabelText(/Mã môn/)).toBeDisabled();
    // The locked numeric fields carry a lock-hint button inside their <label>,
    // so query them by role instead of by label text.
    await expect(c.getByRole("spinbutton", { name: "Số tiết" })).toBeDisabled();
    await expect(
      c.getByRole("spinbutton", { name: "Yêu cầu số bài kiểm tra" }),
    ).toBeDisabled();
    await expect(c.getByLabelText("Chỉ tiêu đầu ra")).toBeDisabled();
    await expect(c.getByLabelText("Giáo án gốc")).toBeDisabled();
    await expect(c.getByLabelText("Kho bài tập chung")).toBeDisabled();
    await expect(c.getByLabelText("Kho đề kiểm tra chung")).toBeDisabled();
    // No save affordance at all, and no archive affordance either.
    await expect(c.queryByRole("button", { name: "Lưu thay đổi" })).toBeNull();
    await expect(c.queryByRole("button", { name: "Lưu trữ" })).toBeNull();
  },
};

/** AC-2: edit + save shows the shared "Đã lưu" confirmation. */
export const SaveSuccess: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const name = c.getByLabelText("Tên môn học");
    await userEvent.clear(name);
    await userEvent.type(name, "Toán 10 nâng cao");
    await userEvent.click(c.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(async () => {
      await expect(c.getByRole("status")).toHaveTextContent("Đã lưu");
    });
  },
};

/** AC-2: a rejected save surfaces the mapped failure key as field text. */
export const SaveError: Story = {
  args: {
    onSave: async () => ({ ok: false as const, errorKey: "code-format" }),
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Lưu thay đổi" }));
    const alert = await c.findByRole("alert");
    await expect(alert).toHaveTextContent("Mã môn không hợp lệ");
    await expect(c.getByLabelText(/Mã môn/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};
