import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { TimetableChild } from "@/features/timetable/domain/entities/timetable-child.entity";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import { mapWeeklyTimetable } from "../../infrastructure/mappers/weekly-timetable.mapper";
import { timetableDtoFor } from "../../infrastructure/repositories/mocks/fixtures";
import { TimetableView } from "./timetable-view";
import type { TimetableActionResult } from "./timetable-view.i-vm";

// biome-ignore lint/style/noNonNullAssertion: known seed classIds from the fixture.
const TT_11A2: WeeklyTimetable = mapWeeklyTimetable(timetableDtoFor("11A2")!);
// biome-ignore lint/style/noNonNullAssertion: known seed classIds from the fixture.
const TT_8B1: WeeklyTimetable = mapWeeklyTimetable(timetableDtoFor("8B1")!);

const CHILDREN: TimetableChild[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    classId: "11A2",
    className: "11A2",
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
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
