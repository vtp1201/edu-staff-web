import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { joinAbsenceReasons } from "@/features/attendance/domain/join-absence-reasons";
import { summarizeAttendance } from "@/features/attendance/domain/summarize-attendance";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ChildAttendanceRecord } from "@/features/parent-attendance/domain/entities/child-attendance-record.entity";
import { AttendanceSummaryBlock } from "./attendance-summary";

const m = messages.attendanceSummary;

/**
 * The stories feed the block through the SAME domain functions the two screens
 * use (`summarizeAttendance` + `joinAbsenceReasons`) rather than hand-writing
 * summary numbers — so a story can never show an arithmetic the real screens
 * would not produce.
 */
const rec = (
  date: string,
  status: ChildAttendanceRecord["status"],
): ChildAttendanceRecord => ({ date, status });

const RECORDS: ChildAttendanceRecord[] = [
  ...Array.from({ length: 18 }, (_, i) =>
    rec(`2026-03-${String(i + 1).padStart(2, "0")}`, "present" as const),
  ),
  rec("2026-03-19", "excusedAbsent"),
  rec("2026-03-20", "late"),
  ...Array.from({ length: 8 }, (_, i) =>
    rec(`2026-04-${String(i + 1).padStart(2, "0")}`, "present" as const),
  ),
  rec("2026-04-09", "absent"),
];

const APPROVED_LEAVE: LeaveRequestEntity = {
  id: "lr-1",
  studentId: "st-1",
  studentName: "Nguyễn Minh Khoa",
  initials: "NK",
  avatarTone: "primary",
  classId: "cls-1",
  className: "11A2",
  submittedBy: "parent" as const,
  submitterName: "Nguyễn Văn A",
  reason: "Khám sức khoẻ định kỳ (có đơn PH)",
  startDate: "19/03/2026",
  endDate: "19/03/2026",
  dayCount: 1,
  type: "other" as const,
  status: "approved" as const,
  submittedAt: "2026-03-18T02:00:00Z",
  approvedBy: "Nguyễn Thị Hương",
  rejectedBy: null,
  rejectionReason: null,
};

const PENDING_LEAVE: LeaveRequestEntity = {
  ...APPROVED_LEAVE,
  id: "lr-2",
  status: "pending" as const,
  startDate: "10/05/2026",
  endDate: "12/05/2026",
  reason: "Việc gia đình",
  approvedBy: null,
};

function propsFor(
  records: ChildAttendanceRecord[],
  leave: LeaveRequestEntity[] = [],
) {
  const { summary, months } = summarizeAttendance(records);
  return { summary, months, history: joinAbsenceReasons(records, leave) };
}

const meta = {
  title: "Shared/AttendanceSummaryBlock",
  component: AttendanceSummaryBlock,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof AttendanceSummaryBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full block: rate, monthly bars, absences with a joined reason. */
export const Full: Story = {
  args: propsFor(RECORDS, [APPROVED_LEAVE]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 26 present of 29 recorded days (1 late + 1 excused + 1 unexcused) = 89.7%.
    await expect(canvas.getByText("89.7%")).toBeInTheDocument();
    await expect(canvas.getByText("26/29")).toBeInTheDocument();

    // LATE is in the denominator but not the numerator — say so explicitly.
    await expect(
      canvas.getByText(m.lateNotice.replace("{count}", "1")),
    ).toBeInTheDocument();

    // Two months → two accessible progress bars, each with a real value.
    const bars = canvas.getAllByRole("progressbar");
    await expect(bars).toHaveLength(2);
    for (const bar of bars) await expect(bar).toHaveAttribute("aria-valuenow");

    // The APPROVED request supplies the reason on its day.
    await expect(canvas.getByText(APPROVED_LEAVE.reason)).toBeInTheDocument();
    // An unexcused day with no request says so in TEXT, not colour alone.
    await expect(canvas.getByText(m.noReason)).toBeInTheDocument();
  },
};

/** AC: no records → "Không có buổi vắng nào" + an em-dash, never `NaN`/`0%`. */
export const Empty: Story = {
  args: propsFor([]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(m.historyEmptyTitle)).toBeInTheDocument();
    // Two unavailable stat values (rate + present/total), each with sr-only text.
    await expect(canvas.getAllByText("—")).toHaveLength(2);
    await expect(canvas.getAllByText(m.unavailableHint)).toHaveLength(2);
    await expect(canvas.queryByText(/NaN/)).toBeNull();
    // …but the excused/unexcused counters are real zeroes, not em-dashes.
    await expect(canvas.getAllByText("0")).toHaveLength(2);
    await expect(canvas.queryAllByRole("progressbar")).toHaveLength(0);
  },
};

/** A still-SUBMITTED request is the FIRST history row, tone-distinct. */
export const WithPendingRow: Story = {
  args: propsFor(RECORDS, [APPROVED_LEAVE, PENDING_LEAVE]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Scope to the history card: "Vắng có phép" is BOTH a stat-card label and
    // a badge label (same design copy), so an unscoped query is ambiguous.
    const history = within(
      canvas.getByRole("region", { name: m.historyTitle }),
    );

    const rows = history.getAllByRole("listitem");
    await expect(rows.length).toBeGreaterThan(1);
    // The pending request is the FIRST row (AC).
    await expect(rows[0]).toHaveTextContent(m.statusPending);

    // Its whole range is shown, not just the first day.
    await expect(
      history.getByText(
        m.pendingRange
          .replace("{startDate}", "10/05/2026")
          .replace("{endDate}", "12/05/2026"),
      ),
    ).toBeInTheDocument();

    // "Chờ duyệt" must not be styled as "Vắng có phép" — different tone class.
    const pendingChip = history.getByText(m.statusPending).closest("span");
    const excusedChip = history.getByText(m.statusExcused).closest("span");
    await expect(pendingChip?.className).not.toBe(excusedChip?.className);
  },
};

/** 375px: the stat grid is 2×2 and nothing overflows. */
export const Mobile: Story = {
  args: propsFor(RECORDS, [PENDING_LEAVE]),
  globals: { viewport: { value: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(m.historyTitle)).toBeInTheDocument();
    await expect(canvas.getByText(m.byMonthTitle)).toBeInTheDocument();
  },
};
