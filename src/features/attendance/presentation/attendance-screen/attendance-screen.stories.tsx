import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceRoster } from "../../domain/entities/attendance-roster.entity";
import { AttendanceScreen } from "./attendance-screen";

const classDate: AttendanceRoster["classDate"] = {
  classId: "c-1",
  date: "2026-06-07",
};

const records: AttendanceRecord[] = [
  { studentId: "s1", studentName: "Nguyễn Văn An", status: "present" },
  { studentId: "s2", studentName: "Trần Thị Bình", status: "absent" },
  { studentId: "s3", studentName: "Lê Quốc Châu", status: "excusedAbsent" },
  { studentId: "s4", studentName: "Phạm Minh Dũng", status: "present" },
  { studentId: "s5", studentName: "Hoàng Văn Em", status: "late" },
];

const historyFixture: AttendanceDaySummary[] = [
  {
    date: "2026-06-06",
    counts: { present: 4, absent: 1, late: 0, excusedAbsent: 0 },
    totalStudents: 5,
  },
  {
    date: "2026-06-05",
    counts: { present: 3, absent: 0, late: 1, excusedAbsent: 1 },
    totalStudents: 5,
  },
];

const saveAction = () => Promise.resolve({ ok: true } as const);
const getHistoryAction = () =>
  Promise.resolve({ ok: true, data: historyFixture } as const);
const getHistoryActionEmpty = () =>
  Promise.resolve({ ok: true, data: [] as AttendanceDaySummary[] } as const);
const getHistoryActionError = () =>
  Promise.resolve({ ok: false, errorKey: "network-error" } as const);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

const meta: Meta<typeof AttendanceScreen> = {
  title: "Attendance/AttendanceScreen",
  component: AttendanceScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <QueryClientProvider client={makeQueryClient()}>
        <NextIntlClientProvider locale="vi" messages={messages}>
          <div className="p-6">
            <Story />
          </div>
          <Toaster />
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AttendanceScreen>;

const classes = [{ id: "c-1", name: "10A1" }];

/**
 * Roster loaded: editable 4-state table, summary, save/all-present controls.
 *
 * ADR `0058` §1: the period selector is REMOVED, not hidden — this play
 * asserts there is exactly ONE filter combobox (class only; date uses a plain
 * `<input type="date">`, not a Select) and that no "period"/"period-of-day"
 * copy leaked back in. Also proves the summary card's counts and the roster
 * table's column set (no `studentCode` column — dropped per ADR `0058` §3).
 */
export const WithRoster: Story = {
  args: {
    classes,
    roster: { classDate, records },
    filters: { classId: "c-1", date: "2026-06-07" },
    saveAction,
    getHistoryAction,
  },
  play: async ({ canvas, userEvent }) => {
    // Period selector genuinely removed: only the class Select renders as a
    // combobox; the date field is a plain date input, not a second Select.
    await expect(canvas.getAllByRole("combobox")).toHaveLength(1);
    await expect(canvas.queryByLabelText(/tiết/i)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/tiết học/i)).not.toBeInTheDocument();

    // Summary card: 4th `late` tile present, counts computed from the fixture
    // (2 present, 1 absent, 1 excusedAbsent, 1 late → rate 40%).
    const totalCard = canvas.getByText("Sĩ số").closest('[data-slot="card"]');
    await expect(totalCard).toHaveTextContent("5");
    const lateCard = canvas
      .getByText("Muộn", { selector: "div" })
      .closest('[data-slot="card"]');
    await expect(lateCard).toHaveTextContent("1");
    const rateCard = canvas.getByText("Tỷ lệ").closest('[data-slot="card"]');
    await expect(rateCard).toHaveTextContent("40%");

    // Roster table: exactly 3 columns (#, student, status) — no student-code
    // column reappearing (dropped per ADR `0058` §3, no wire source).
    const columnHeaders = canvas.getAllByRole("columnheader");
    await expect(columnHeaders).toHaveLength(3);
    await expect(canvas.queryByText(/mã học sinh/i)).not.toBeInTheDocument();

    // 4-state toggle: click `late` for a present student, assert the tinted
    // (not solid) selected state applies (A11Y-101 fix) and `present` still
    // works for a regression check on another row.
    const row = canvas.getByText("Nguyễn Văn An").closest("tr") as HTMLElement;
    const rowCanvas = within(row);
    const lateToggle = rowCanvas.getByRole("radio", { name: "Muộn" });
    await userEvent.click(lateToggle);
    await expect(lateToggle).toHaveAttribute("data-state", "on");
    await expect(lateToggle.className).toContain("bg-edu-info/15");

    const absentRow = canvas
      .getByText("Phạm Minh Dũng")
      .closest("tr") as HTMLElement;
    const absentToggle = within(absentRow).getByRole("radio", {
      name: "Vắng KP",
    });
    await userEvent.click(absentToggle);
    await expect(absentToggle).toHaveAttribute("data-state", "on");
  },
};

/** No class/date selected yet — friendly empty state (period selector removed). */
export const Empty: Story = {
  args: {
    classes,
    roster: null,
    filters: {},
    saveAction,
    getHistoryAction: getHistoryActionEmpty,
  },
};

/**
 * History tab: per-day status-count summary (no more date/period/subject
 * rows). Also proves the A11Y-103 fix — the `role="status" aria-live="polite"`
 * wrapper is present around the populated state (not just the loading/error
 * ones), and that each day's summary counts render (not the old
 * date/period/subject table shape).
 */
export const HistoryTab: Story = {
  args: {
    classes,
    roster: { classDate, records },
    filters: { classId: "c-1", date: "2026-06-07" },
    saveAction,
    getHistoryAction,
  },
  play: async ({ canvas, userEvent }) => {
    const historyTab = canvas.getByRole("tab", { name: /lịch sử/i });
    await userEvent.click(historyTab);
    await expect(await canvas.findByText("2026-06-06")).toBeInTheDocument();

    const liveRegion = canvas.getByRole("status");
    await expect(liveRegion).toHaveAttribute("aria-live", "polite");

    // Per-day status-count summary for 2026-06-06 (present 4, absent 1,
    // late 0, excusedAbsent 0) — proves day-summary aggregation, not a
    // date/period/subject row list.
    const dayRow = canvas.getByText("2026-06-06").closest("tr") as HTMLElement;
    const dayCanvas = within(dayRow);
    await expect(dayCanvas.getByText(/Có mặt 4/)).toBeInTheDocument();
    await expect(dayCanvas.getByText(/Vắng KP 1/)).toBeInTheDocument();
    await expect(dayCanvas.getByText(/Muộn 0/)).toBeInTheDocument();
    await expect(dayCanvas.getByText(/Vắng phép 0/)).toBeInTheDocument();

    // Second day (2026-06-05: present 3, late 1, excusedAbsent 1) confirms
    // the aggregation isn't hardcoded to the first fixture row.
    const secondDayRow = canvas
      .getByText("2026-06-05")
      .closest("tr") as HTMLElement;
    await expect(within(secondDayRow).getByText(/Muộn 1/)).toBeInTheDocument();
  },
};

/** History tab empty state. */
export const HistoryEmpty: Story = {
  args: {
    classes,
    roster: { classDate, records },
    filters: { classId: "c-1", date: "2026-06-07" },
    saveAction,
    getHistoryAction: getHistoryActionEmpty,
  },
  play: async ({ canvas, userEvent }) => {
    const historyTab = canvas.getByRole("tab", { name: /lịch sử/i });
    await userEvent.click(historyTab);
    await expect(
      await canvas.findByText("Chưa có lịch sử điểm danh"),
    ).toBeInTheDocument();
  },
};

/** History tab error state (e.g. every day in the range unreachable). */
export const HistoryError: Story = {
  args: {
    classes,
    roster: { classDate, records },
    filters: { classId: "c-1", date: "2026-06-07" },
    saveAction,
    getHistoryAction: getHistoryActionError,
  },
  play: async ({ canvas, userEvent }) => {
    const historyTab = canvas.getByRole("tab", { name: /lịch sử/i });
    await userEvent.click(historyTab);
    await expect(
      await canvas.findByText("Không tải được lịch sử điểm danh"),
    ).toBeInTheDocument();
  },
};

/**
 * Save flow — success path. Proves `saveAction` is invoked with the NEW
 * `(classId, date, records)` signature (ADR `0058`, replacing the old
 * period-keyed save) and that a save-success toast renders.
 */
export const SaveSuccess: Story = {
  args: {
    classes,
    roster: { classDate, records },
    filters: { classId: "c-1", date: "2026-06-07" },
    saveAction: fn(async () => ({ ok: true }) as const),
    getHistoryAction,
  },
  play: async ({ canvas, userEvent, args }) => {
    const row = canvas.getByText("Nguyễn Văn An").closest("tr") as HTMLElement;
    const lateToggle = within(row).getByRole("radio", { name: "Muộn" });
    await userEvent.click(lateToggle);

    const saveBtn = canvas.getByRole("button", { name: /lưu điểm danh/i });
    await expect(saveBtn).toBeEnabled();
    await userEvent.click(saveBtn);

    const body = within(document.body);
    await expect(await body.findByText("Đã lưu điểm danh")).toBeInTheDocument();

    await expect(args.saveAction).toHaveBeenCalledWith(
      "c-1",
      "2026-06-07",
      expect.arrayContaining([
        expect.objectContaining({ studentId: "s1", status: "late" }),
      ]),
    );
  },
};

/**
 * Save flow — correction-window-expired (403) failure. Proves the toast
 * shows the ground-truthed translated message via `errorKey`
 * (`attendance.errors.correction-window-expired`), not a raw BE message
 * (ADR `0058` §6 — reactive gate through the existing save-error toast).
 */
export const SaveError_CorrectionWindowExpired: Story = {
  args: {
    classes,
    roster: { classDate, records },
    filters: { classId: "c-1", date: "2026-06-07" },
    saveAction: fn(
      async () =>
        ({ ok: false, errorKey: "correction-window-expired" }) as const,
    ),
    getHistoryAction,
  },
  play: async ({ canvas, userEvent }) => {
    const row = canvas.getByText("Nguyễn Văn An").closest("tr") as HTMLElement;
    const lateToggle = within(row).getByRole("radio", { name: "Muộn" });
    await userEvent.click(lateToggle);

    const saveBtn = canvas.getByRole("button", { name: /lưu điểm danh/i });
    await userEvent.click(saveBtn);

    const body = within(document.body);
    await expect(
      await body.findByText("Chỉ được sửa điểm danh trong ngày"),
    ).toBeInTheDocument();
  },
};

// US-E17.1 AC-05: at 375px the attendance-summary stat grid uses the auto-fit
// minmax(200px) column class (1 column on mobile) with a 16px gap-4 gap.
const VIEWPORT_375 = {
  viewports: {
    mobile375: {
      name: "Mobile 375",
      styles: { width: "375px", height: "812px" },
      type: "mobile" as const,
    },
  },
  defaultViewport: "mobile375",
};

export const Viewport375: Story = {
  args: {
    classes,
    roster: { classDate, records },
    filters: { classId: "c-1", date: "2026-06-07" },
    saveAction,
    getHistoryAction,
  },
  parameters: { viewport: VIEWPORT_375 },
  play: async ({ canvasElement }) => {
    const grid = canvasElement.querySelector<HTMLElement>(
      '[class*="auto-fit"]',
    );
    await expect(grid).not.toBeNull();
    await expect(grid?.className).toContain(
      "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]",
    );
    await expect(grid?.className).toContain("gap-4");
  },
};
