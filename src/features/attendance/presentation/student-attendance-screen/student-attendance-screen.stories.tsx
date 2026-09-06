import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { joinAbsenceReasons } from "@/features/attendance/domain/join-absence-reasons";
import { summarizeAttendance } from "@/features/attendance/domain/summarize-attendance";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ChildAttendanceRecord } from "@/features/parent-attendance/domain/entities/child-attendance-record.entity";
import { StudentAttendanceScreen } from "./student-attendance-screen";
import type { StudentAttendanceScreenVM } from "./student-attendance-screen.i-vm";

const m = messages.studentAttendance;
const RANGE = { startDate: "2026-03-06", endDate: "2026-09-06" };

const RECORDS: ChildAttendanceRecord[] = [
  ...Array.from({ length: 20 }, (_, i) =>
    rec(`2026-03-${String(i + 1).padStart(2, "0")}`, "present" as const),
  ),
  rec("2026-03-21", "excusedAbsent"),
  rec("2026-04-09", "absent"),
];

function rec(
  date: string,
  status: ChildAttendanceRecord["status"],
): ChildAttendanceRecord {
  return { date, status };
}

const PENDING: LeaveRequestEntity = {
  id: "lr-9",
  studentId: "stu-1",
  studentName: "Nguyễn Minh Khoa",
  initials: "NK",
  avatarTone: "primary",
  classId: "cls-1",
  className: "11A2",
  submittedBy: "student",
  submitterName: "Nguyễn Minh Khoa",
  reason: "Khám sức khoẻ",
  startDate: "10/09/2026",
  endDate: "10/09/2026",
  dayCount: 1,
  type: "other",
  status: "pending",
  submittedAt: "2026-09-06T02:00:00Z",
  approvedBy: null,
  rejectedBy: null,
  rejectionReason: null,
};

function readyVm(
  records: ChildAttendanceRecord[],
  leave: LeaveRequestEntity[] = [],
): StudentAttendanceScreenVM {
  const { summary, months } = summarizeAttendance(records);
  return {
    status: "ready",
    range: RANGE,
    summary,
    months,
    history: joinAbsenceReasons(records, leave),
  };
}

const meta = {
  title: "Attendance/StudentAttendanceScreen",
  component: StudentAttendanceScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: { onRetry: fn() },
} satisfies Meta<typeof StudentAttendanceScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  args: { vm: readyVm(RECORDS, [PENDING]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: m.title }),
    ).toBeInTheDocument();
    // The applied range is always stated — the term read may have 403'd and
    // fallen back to six months, and a silent denominator is unexplainable.
    await expect(
      canvas.getByText(
        m.rangeNotice
          .replace("{startDate}", "06/03/2026")
          .replace("{endDate}", "06/09/2026"),
      ),
    ).toBeInTheDocument();
    await expect(canvas.getByText("20/22")).toBeInTheDocument();
    await expect(
      canvas.getByText(messages.attendanceSummary.statusPending),
    ).toBeInTheDocument();
  },
};

/** AC: no records → the empty history + an em-dash, never `NaN` or a red 0%. */
export const Empty: Story = {
  args: { vm: readyVm([]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.attendanceSummary.historyEmptyTitle),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText("—")).toHaveLength(2);
    await expect(canvas.queryByText(/NaN/)).toBeNull();
  },
};

/**
 * AC: a session with no `memberId` claim never reaches the wire — the screen
 * explains that instead of rendering a 0% summary for nobody.
 */
export const Forbidden: Story = {
  args: { vm: { status: "forbidden" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(m.forbiddenTitle)).toBeInTheDocument();
    await expect(canvas.getByText(m.forbiddenBody)).toBeInTheDocument();
    // No fabricated numbers anywhere.
    await expect(canvas.queryByRole("progressbar")).toBeNull();
    await expect(
      canvas.queryByText(messages.attendanceSummary.rateLabel),
    ).toBeNull();
  },
};

/** A retryable failure offers retry; a terminal one must NOT. */
export const NetworkError: Story = {
  args: { vm: { status: "error", range: RANGE, errorKey: "network-error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(m.errors["network-error"]),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: m.retry }),
    ).toBeInTheDocument();
  },
};

export const ForbiddenByServer: Story = {
  args: { vm: { status: "error", range: RANGE, errorKey: "forbidden" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(m.errors.forbidden)).toBeInTheDocument();
    // Terminal → the retry control is OMITTED, not merely disabled.
    await expect(canvas.queryByRole("button", { name: m.retry })).toBeNull();
  },
};

/** 375px — stat cards fall to 2×2 and the range notice still fits. */
export const Mobile: Story = {
  args: { vm: readyVm(RECORDS, [PENDING]) },
  globals: { viewport: { value: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: m.title }),
    ).toBeInTheDocument();
    // Nothing may extend past the viewport's right edge at 320px
    // (`accessibility.md`: no horizontal break at 320). Measured per element
    // rather than through `document.scrollWidth`, which counts the root's own
    // padding box and reports a phantom overflow.
    const limit = window.innerWidth;
    const overflowing = [...canvasElement.querySelectorAll("*")].filter(
      (el) => el.getBoundingClientRect().right > limit + 1,
    );
    await expect(overflowing).toHaveLength(0);
  },
};
