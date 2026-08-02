import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";
import type { TimetableChild } from "@/features/timetable/domain/entities/timetable-child.entity";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import { mapWeeklyTimetable } from "../../infrastructure/mappers/weekly-timetable.mapper";
import {
  teacherScheduleDtoFor,
  timetableDtoFor,
} from "../../infrastructure/repositories/mocks/fixtures";
import { TimetableView } from "./timetable-view";
import type { TimetableActionResult } from "./timetable-view.i-vm";

// biome-ignore lint/style/noNonNullAssertion: known seed classIds from the fixture.
const TT_11A2: WeeklyTimetable = mapWeeklyTimetable(timetableDtoFor("11A2")!);
// biome-ignore lint/style/noNonNullAssertion: known seed classIds from the fixture.
const TT_8B1: WeeklyTimetable = mapWeeklyTimetable(timetableDtoFor("8B1")!);

const CHILDREN: TimetableChild[] = [
  {
    childId: "c1",
    ordinal: 1,
    name: "Nguyễn Minh Khoa",
    classId: "11A2",
    className: "11A2",
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
    ordinal: 2,
    name: "Nguyễn Thu Hà",
    classId: "8B1",
    className: "8B1",
    avatar: "NH",
    color: "success",
  },
];

const meta: Meta<typeof TimetableView> = {
  title: "Timetable/TimetableView",
  component: TimetableView,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof TimetableView>;

/* ── AC1: student full week ─────────────────────────────────────────────── */
export const StudentView_FullWeek: Story = {
  args: {
    viewerRole: "student",
    initialState: { status: "success", timetable: TT_11A2 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Real <table> with a caption naming the class.
    expect(canvas.getByRole("table", { name: /11A2/ })).toBeInTheDocument();
    // Day column headers.
    expect(canvas.getByRole("columnheader", { name: "Thứ 2" })).toBeVisible();
    // A period row header.
    expect(canvas.getByRole("rowheader", { name: /Tiết 1\b/ })).toBeVisible();
    // Subject text is present (color is not the only signal).
    expect(canvas.getAllByText("Toán").length).toBeGreaterThan(0);
    // Recess row renders visible text.
    expect(canvas.getByText(/Giải lao trưa/)).toBeVisible();
    // Read-only affordance, no edit affordance.
    expect(canvas.getByText("Chỉ xem")).toBeVisible();
    expect(canvas.queryByRole("button", { name: /Thêm|Sửa/ })).toBeNull();
  },
};

/* ── AC5: empty class ───────────────────────────────────────────────────── */
export const StudentView_EmptyTimetable: Story = {
  args: { viewerRole: "student", initialState: { status: "empty" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.getByText("Chưa có thời khoá biểu cho lớp này."),
    ).toBeVisible();
    expect(canvas.queryByRole("table")).toBeNull();
  },
};

/* ── AC2: parent, single child → no switcher ────────────────────────────── */
export const ParentView_SingleChild: Story = {
  args: {
    viewerRole: "parent",
    initialState: { status: "success", timetable: TT_11A2 },
    childList: [CHILDREN[0]],
    initialChildId: "c1",
    fetchChildTimetable: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No child-picker buttons render for a single child.
    expect(
      canvas.queryByRole("button", { name: /Nguyễn Minh Khoa/ }),
    ).toBeNull();
    // Week navigator is present (parent variant).
    expect(canvas.getByRole("button", { name: "Tuần trước" })).toBeVisible();
    expect(canvas.getByRole("table", { name: /11A2/ })).toBeInTheDocument();
  },
};

/* ── AC2: parent, multi child → switch reloads grid ─────────────────────── */
export const ParentView_MultiChild_Switch: Story = {
  args: {
    viewerRole: "parent",
    initialState: { status: "success", timetable: TT_11A2 },
    childList: CHILDREN,
    initialChildId: "c1",
    fetchChildTimetable: fn(
      async (): Promise<TimetableActionResult> => ({
        ok: true,
        data: TT_8B1,
      }),
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const c1 = canvas.getByRole("button", { name: /Nguyễn Minh Khoa/ });
    const c2 = canvas.getByRole("button", { name: /Nguyễn Thu Hà/ });
    expect(c1).toHaveAttribute("aria-pressed", "true");
    expect(c2).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(c2);

    expect(c2).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(args.fetchChildTimetable).toHaveBeenCalledWith("c2"),
    );
    // Grid re-renders for the switched child's class.
    await waitFor(() =>
      expect(canvas.getByRole("table", { name: /8B1/ })).toBeInTheDocument(),
    );
  },
};

/* ── AC5: loading skeleton ──────────────────────────────────────────────── */
export const Loading_Skeleton: Story = {
  args: { viewerRole: "student", initialState: { status: "loading" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText("Đang tải thời khoá biểu…")).toBeVisible();
    expect(canvas.queryByRole("table")).toBeNull();
  },
};

/* ── AC5: error banner + retry ──────────────────────────────────────────── */
export const ErrorState: Story = {
  args: {
    viewerRole: "student",
    initialState: { status: "error", errorKey: "network-error" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(
      within(alert).getByRole("button", { name: "Thử lại" }),
    ).toBeVisible();
  },
};

/* ── AC6: mobile (375px) — grid stays scrollable ────────────────────────── */
export const StudentView_Mobile: Story = {
  args: {
    viewerRole: "student",
    initialState: { status: "success", timetable: TT_11A2 },
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Table still renders (its min-width forces horizontal scroll on mobile).
    expect(canvas.getByRole("table", { name: /11A2/ })).toBeInTheDocument();
  },
};

/* ── US-E18.26: real-mode parent roster — no display name, no class ─────── */
/**
 * Real mode has no student display name (cross-repo ask #20 residual) and the
 * class context is omitted whenever the child has no current enrollment. The
 * picker must degrade to a STABLE ordinal label + a "chưa có lớp" caption —
 * never a blank line, never an invented name.
 */
const DEGRADED_CHILDREN: TimetableChild[] = [
  {
    childId: "stu-a",
    ordinal: 1,
    className: "10A1",
    avatar: "1",
    color: "primary",
  },
  { childId: "stu-b", ordinal: 2, avatar: "2", color: "success" },
];

export const ParentView_RealMode_NoNameFallback: Story = {
  args: {
    viewerRole: "parent",
    initialState: { status: "success", timetable: TT_11A2 },
    childList: DEGRADED_CHILDREN,
    initialChildId: "stu-a",
    fetchChildTimetable: fn(
      async (): Promise<TimetableActionResult> => ({ ok: true, data: TT_8B1 }),
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Accessible name is derived from visible text only — ordinal + class line.
    const first = canvas.getByRole("button", { name: /Con thứ 1 Lớp 10A1/ });
    const second = canvas.getByRole("button", {
      name: /Con thứ 2 Chưa có lớp/,
    });
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("aria-pressed", "false");

    // The fallback is still a fully operable control.
    await userEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(args.fetchChildTimetable).toHaveBeenCalledWith("stu-b"),
    );
  },
};

/* ── US-E15.3: principal viewing a teacher's week ───────────────────────── */

const TT_TEACHER: WeeklyTimetable = mapWeeklyTimetable(
  // biome-ignore lint/style/noNonNullAssertion: known seed teacherId from the fixture.
  teacherScheduleDtoFor("t1")!,
);

function teacher(patch: Partial<PrincipalTeacher>): PrincipalTeacher {
  return {
    teacherId: "t1",
    displayName: "Cô Nguyễn Thị Hương",
    email: "huong@eduportal.vn",
    primarySubjectName: "Toán",
    homeroomClassId: "11A2",
    homeroomClassName: "11A2",
    subjectAssignments: [],
    status: "ACTIVE",
    ...patch,
  };
}

const TEACHERS: PrincipalTeacher[] = [
  teacher({}),
  teacher({
    teacherId: "t2",
    displayName: "Thầy Trần Văn Minh",
    homeroomClassId: null,
    homeroomClassName: null,
    status: "ON_LEAVE",
  }),
];

/** AC1/AC2: picker defaults to the first teacher; switching refetches. */
export const PrincipalView_SwitchTeacher: Story = {
  args: {
    viewerRole: "principal",
    initialState: { status: "success", timetable: TT_TEACHER },
    teacherList: TEACHERS,
    initialTeacherId: "t1",
    fetchMemberTimetable: fn(
      async (): Promise<TimetableActionResult> => ({
        ok: true,
        data: TT_8B1,
      }),
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // cellVariant="teacher" → each slot names the CLASS being taught, and the
    // header carries no class suffix (a teacher's week spans many classes).
    expect(
      canvas.getByRole("table", { name: /Lịch dạy cá nhân/ }),
    ).toBeInTheDocument();
    expect(canvas.getAllByText("11A2").length).toBeGreaterThan(0);

    // Week navigation is live for the principal (AC5).
    expect(canvas.getByRole("button", { name: "Tuần trước" })).toBeVisible();

    const first = canvas.getByRole("button", { name: /Nguyễn Thị Hương/ });
    const second = canvas.getByRole("button", { name: /Trần Văn Minh/ });
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("aria-pressed", "false");
    // ON_LEAVE is labelled (text, not colour alone) and stays SELECTABLE.
    expect(within(second).getByText("Đang nghỉ phép")).toBeVisible();
    expect(second).toBeEnabled();
    expect(within(second).getByText("Chưa chủ nhiệm lớp nào")).toBeVisible();

    await userEvent.click(second);

    expect(second).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(args.fetchMemberTimetable).toHaveBeenCalledWith("t2"),
    );
    await waitFor(() => expect(canvas.getByRole("table")).toBeInTheDocument());
  },
};

/** AC3: single teacher → no picker (same UX rule as the parent's single child). */
export const PrincipalView_SingleTeacher: Story = {
  args: {
    viewerRole: "principal",
    initialState: { status: "success", timetable: TT_TEACHER },
    teacherList: [TEACHERS[0]],
    initialTeacherId: "t1",
    fetchMemberTimetable: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.queryByRole("button", { name: /Nguyễn Thị Hương/ }),
    ).toBeNull();
    expect(canvas.getByRole("button", { name: "Tuần sau" })).toBeVisible();
  },
};

/** AC3: zero teachers → the shared empty state, no picker, no grid. */
export const PrincipalView_NoTeachers: Story = {
  args: {
    viewerRole: "principal",
    initialState: { status: "empty" },
    teacherList: [],
    fetchMemberTimetable: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.getByText("Chưa có thời khoá biểu cho lớp này."),
    ).toBeVisible();
    expect(canvas.queryByRole("table")).toBeNull();
  },
};

/** AC4: selected teacher has no published schedule → same empty state. */
export const PrincipalView_NotPublished: Story = {
  args: {
    viewerRole: "principal",
    initialState: { status: "success", timetable: TT_TEACHER },
    teacherList: TEACHERS,
    initialTeacherId: "t1",
    fetchMemberTimetable: fn(
      async (): Promise<TimetableActionResult> => ({
        ok: false,
        errorKey: "not-found",
      }),
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Trần Văn Minh/ }),
    );

    await waitFor(() =>
      expect(args.fetchMemberTimetable).toHaveBeenCalledWith("t2"),
    );
    // `not-found` is not an error for the viewer — it is "nothing published".
    await waitFor(() =>
      expect(
        canvas.getByText("Chưa có thời khoá biểu cho lớp này."),
      ).toBeVisible(),
    );
    expect(canvas.queryByRole("alert")).toBeNull();
  },
};

/** Error banner retry re-runs the MEMBER fetch (not router.refresh). */
export const PrincipalView_ErrorRetry: Story = {
  args: {
    viewerRole: "principal",
    initialState: { status: "error", errorKey: "network-error" },
    teacherList: TEACHERS,
    initialTeacherId: "t1",
    fetchMemberTimetable: fn(
      async (): Promise<TimetableActionResult> => ({
        ok: true,
        data: TT_TEACHER,
      }),
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    await userEvent.click(
      within(alert).getByRole("button", { name: "Thử lại" }),
    );

    await waitFor(() =>
      expect(args.fetchMemberTimetable).toHaveBeenCalledWith("t1"),
    );
    await waitFor(() => expect(canvas.getByRole("table")).toBeInTheDocument());
  },
};
