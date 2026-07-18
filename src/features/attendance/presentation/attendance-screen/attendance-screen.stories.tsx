import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
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
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AttendanceScreen>;

const classes = [{ id: "c-1", name: "10A1" }];

/** Roster loaded: editable 4-state table, summary, save/all-present controls. */
export const WithRoster: Story = {
  args: {
    classes,
    roster: { classDate, records },
    filters: { classId: "c-1", date: "2026-06-07" },
    saveAction,
    getHistoryAction,
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

/** History tab: per-day status-count summary (no more date/period/subject rows). */
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
