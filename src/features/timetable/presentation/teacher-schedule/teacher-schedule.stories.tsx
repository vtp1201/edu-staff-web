import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import { mapWeeklyTimetable } from "../../infrastructure/mappers/weekly-timetable.mapper";
import { teacherScheduleDtoFor } from "../../infrastructure/repositories/mocks/fixtures";
import { TeacherScheduleScreen } from "./teacher-schedule";

const t1Dto = teacherScheduleDtoFor("t1");
if (!t1Dto) throw new Error("missing teacher fixture seed 't1'");
const TEACHER_T1: WeeklyTimetable = mapWeeklyTimetable(t1Dto);

const meta: Meta<typeof TeacherScheduleScreen> = {
  title: "Timetable/TeacherScheduleScreen",
  component: TeacherScheduleScreen,
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
type Story = StoryObj<typeof TeacherScheduleScreen>;

/* ── AC1/AC3/AC4/AC7: teacher full week across classes ──────────────────── */
export const TeacherView_FullWeek: Story = {
  args: { initialState: { status: "success", timetable: TEACHER_T1 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // AC7 — real <table>; the sr-only caption is the teacher-specific copy
    // (NOT "class X") — this is the a11y caption assertion.
    expect(
      canvas.getByRole("table", { name: /Lịch dạy cá nhân/ }),
    ).toBeInTheDocument();
    // Day + period headers (semantics inherited from TimetableGrid).
    expect(canvas.getByRole("columnheader", { name: "Thứ 2" })).toBeVisible();
    expect(canvas.getByRole("rowheader", { name: /Tiết 1\b/ })).toBeVisible();
    // AC1 — subject line present (color is not the only signal).
    expect(canvas.getAllByText("Toán").length).toBeGreaterThan(0);
    // AC1 — teacher cell secondary line shows the CLASS taught (not a teacher name).
    expect(canvas.getAllByText("11A2").length).toBeGreaterThan(0);
    expect(canvas.getAllByText("8B1").length).toBeGreaterThan(0);
    expect(canvas.getAllByText("10C3").length).toBeGreaterThan(0);
    // Recess row still renders.
    expect(canvas.getByText(/Giải lao trưa/)).toBeVisible();
    // AC2 — read-only, no edit affordance: no add/edit buttons, no pencil/edit icon.
    expect(canvas.getByText("Chỉ xem")).toBeVisible();
    expect(canvas.queryByRole("button", { name: /Thêm|Sửa/ })).toBeNull();
    expect(
      canvasElement.querySelector(
        "svg.lucide-pencil, svg.lucide-square-pen, svg.lucide-edit, svg.lucide-edit-2, svg.lucide-edit-3",
      ),
    ).toBeNull();
    // AC3 — visual consistency: a subject-colour /15 tint + 3px left accent
    // border, the same token pair `TimetableGrid` renders for the
    // student/parent variant. WHICH colour a subject gets is assigned per week
    // (domain/subject-color.ts), so assert the shape, not one hue — and assert
    // it is never the grey fallback, which is what every real slot used to be.
    const mathCellLabel = canvas.getAllByText("Toán")[0];
    const mathCell = mathCellLabel.parentElement;
    expect(mathCell?.className).toMatch(/bg-edu-[a-z-]+\/15/);
    expect(mathCell?.className).toMatch(/border-l-edu-[a-z-]+/);
    expect(mathCell?.className).not.toContain("edu-text-muted");
    // AC4 — legend shows only subjects actually taught (Toán + GDCD).
    const legend = canvas.getByRole("region", { name: "Chú thích môn" });
    expect(within(legend).getByText("Toán")).toBeVisible();
    expect(within(legend).getByText("GDCD")).toBeVisible();
    expect(within(legend).queryByText("Vật lý")).toBeNull();
  },
};

/* ── AC5: teacher with no schedule ──────────────────────────────────────── */
export const TeacherView_EmptySchedule: Story = {
  args: { initialState: { status: "empty" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Chưa có lịch dạy trong tuần này.")).toBeVisible();
    expect(
      canvas.getByText("Bạn chưa có lịch dạy trong tuần này."),
    ).toBeVisible();
    expect(canvas.queryByRole("table")).toBeNull();
  },
};

/* ── AC5: loading skeleton ──────────────────────────────────────────────── */
export const Loading_Skeleton: Story = {
  args: { initialState: { status: "loading" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText("Đang tải thời khoá biểu…")).toBeVisible();
    expect(canvas.queryByRole("table")).toBeNull();
  },
};

/* ── AC5: error banner + retry ──────────────────────────────────────────── */
export const ErrorState: Story = {
  args: { initialState: { status: "error", errorKey: "network-error" } },
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
export const TeacherView_Mobile: Story = {
  args: { initialState: { status: "success", timetable: TEACHER_T1 } },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Table still renders (its min-width forces horizontal scroll on mobile).
    const table = canvas.getByRole("table", { name: /Lịch dạy cá nhân/ });
    expect(table).toBeInTheDocument();
    // AC6 — grid scrolls horizontally instead of breaking layout at 375px: the
    // table keeps its `min-w-[920px]` and its direct scroll wrapper is
    // `overflow-x-auto` (viewport is narrower than the table, so this wrapper is
    // what prevents the grid from clipping/overlapping other content).
    expect(table.className).toContain("min-w-[920px]");
    expect(table.parentElement?.className).toContain("overflow-x-auto");
    // Period label column stays readable (sticky, not clipped/hidden).
    expect(canvas.getByRole("rowheader", { name: /Tiết 1\b/ })).toBeVisible();
  },
};

/* ── US-E24.8: a taught period deep-links into that class's hub ──────────── */

const HUB_BASE = "/vi/t/t1/teacher/classes";

/** Real-mode slots carry `classId` (`SlotResponse.classId`); the mock fixture
 *  seed does not, so this story builds the linked week explicitly. */
const LINKED_WEEK: WeeklyTimetable = {
  classId: "mem-1",
  className: "Cô Nguyễn Thị Hương",
  slots: {
    0: {
      1: {
        subjectId: "math",
        subjectName: "Toán",
        subjectColorToken: "primary",
        className: "11A2",
        classId: "cls-11a2",
        room: "P.302",
      },
      2: {
        subjectId: "civic",
        subjectName: "GDCD",
        subjectColorToken: "purple",
        className: "8B1",
        room: "P.205",
      },
    },
  },
};

export const TeacherView_ClassHubDeepLink: Story = {
  args: {
    initialState: { status: "success", timetable: LINKED_WEEK },
    classHrefBase: HUB_BASE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A slot WITH a class id is a real anchor into the class hub timetable tab.
    const link = canvas.getByRole("link", { name: /Toán/ });
    expect(link).toHaveAttribute("href", `${HUB_BASE}/cls-11a2?tab=timetable`);
    // The cell keeps its subject-colour tint and gains a visible focus ring.
    expect(link.className).toMatch(/bg-edu-[a-z-]+\/15/);
    expect(link.className).toContain("focus-visible:ring-2");
    // A slot WITHOUT a class id stays unlinked — no dead links.
    expect(canvas.queryByRole("link", { name: /GDCD/ })).toBeNull();
  },
};
