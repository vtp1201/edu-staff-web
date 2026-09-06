import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import enMessages from "@/bootstrap/i18n/messages/en.json";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ChildSwitcherChild } from "@/components/shared/child-switcher";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ChildAttendanceRecord } from "../../domain/entities/child-attendance-record.entity";
import { ParentAttendanceScreen } from "./parent-attendance-screen";
import { resolveRangeFromParams } from "./resolve-range";

/** Seed data, not UI copy — not i18n. */
const CHILDREN: ChildSwitcherChild[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    className: "11A2",
    ordinal: 1,
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
    name: "Nguyễn Thu Hà",
    className: "8B1",
    ordinal: 2,
    avatar: "NH",
    color: "success",
  },
];

const RANGE = { startDate: "2026-08-01", endDate: "2026-08-31" };
/** Frozen "today" — the dialog's date pickers must not depend on the run date. */
const TODAY = "2026-09-06";

const RECORDS: ChildAttendanceRecord[] = [
  { date: "2026-08-03", status: "present" },
  { date: "2026-08-04", status: "late" },
  { date: "2026-08-05", status: "excusedAbsent" },
  { date: "2026-08-06", status: "absent" },
];

const meta: Meta<typeof ParentAttendanceScreen> = {
  title: "ParentAttendance/ParentAttendanceScreen",
  component: ParentAttendanceScreen,
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
type Story = StoryObj<typeof ParentAttendanceScreen>;

export const Populated: Story = {
  args: {
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: RECORDS,
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: null,
    },
    onChildSwitch: fn(),
    onRangeChange: fn(),
    onRetry: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // one row per record, dates rendered DD/MM/YYYY
    const rows = canvas.getAllByRole("row");
    // header row + 4 record rows
    expect(rows).toHaveLength(5);
    expect(canvas.getByText("03/08/2026")).toBeVisible();

    // AC — status is never colour-only: every badge carries its text label,
    // and the row's status cell also carries a (decorative) icon.
    for (const label of ["Có mặt", "Muộn", "Vắng phép", "Vắng KP"]) {
      expect(canvas.getAllByText(label).length).toBeGreaterThan(0);
    }
    const statusCell = canvas.getByText("Muộn").closest("td");
    expect(statusCell?.querySelector("svg")).not.toBeNull();

    // summary chips: 1 of each status over this range
    const summary = canvas.getByRole("list", { name: "Tổng hợp" });
    expect(within(summary).getByText(/Có mặt\s*1/)).toBeVisible();

    // tablist ↔ tabpanel pairing is owned by THIS screen
    const activeTab = canvas.getByRole("tab", { name: /Nguyễn Minh Khoa/ });
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(activeTab).toHaveAttribute("aria-controls", "tabpanel-c1");
    const panel = canvas.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", "tabpanel-c1");
    expect(panel).toHaveAttribute("aria-labelledby", "tab-c1");
  },
};

/**
 * Same VM under the `en` locale (fix round, tech-lead SHOULD-FIX 3 + 4): the
 * date column is formatted by `useFormatter().dateTime`, so it flips to the
 * en ordering (MM/DD/YYYY) instead of the previously hard-coded DD/MM/YYYY, and
 * the summary chip's label/count word order comes from the `summaryChip`
 * message ("Present: 1") rather than JSX concatenation.
 */
export const PopulatedEnglishLocale: Story = {
  args: { ...Populated.args },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // vi renders 03/08/2026 for the same record — locale decides the ordering.
    expect(canvas.getByText("08/03/2026")).toBeVisible();
    expect(canvas.queryByText("03/08/2026")).toBeNull();

    const summary = canvas.getByRole("list", { name: "Summary" });
    expect(within(summary).getByText("Present: 1")).toBeVisible();
    expect(canvas.getByText("Child attendance")).toBeVisible();
  },
};

/** Switching child asks the RSC to re-fetch (URL navigation in the container). */
export const SwitchChild: Story = {
  args: { ...Populated.args, onChildSwitch: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: /Nguyễn Thu Hà/ }));
    expect(args.onChildSwitch).toHaveBeenCalledWith("c2");
  },
};

/** The date inputs are labelled, keyboard-operable and drive a re-fetch. */
export const ChangeDateRange: Story = {
  args: { ...Populated.args, onRangeChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByLabelText("Từ ngày");
    expect(start).toHaveValue("2026-08-01");
    expect(canvas.getByLabelText("Đến ngày")).toHaveValue("2026-08-31");

    await userEvent.clear(start);
    await userEvent.type(start, "2026-08-10");
    expect(args.onRangeChange).toHaveBeenCalled();
  },
};

/** Default range with no URL params = the current calendar month. */
export const DefaultCurrentMonthRange: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: resolveRangeFromParams({}, new Date().toISOString().slice(0, 10)),
      records: RECORDS,
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const lastDay = new Date(Date.UTC(yyyy, today.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);

    expect(canvas.getByLabelText("Từ ngày")).toHaveValue(`${yyyy}-${mm}-01`);
    expect(canvas.getByLabelText("Đến ngày")).toHaveValue(lastDay);
  },
};

export const Loading: Story = {
  args: {
    ...Populated.args,
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Đang tải lịch sử điểm danh")).toBeInTheDocument();
    expect(canvas.queryByRole("table")).toBeNull();
  },
};

/** Zero linked children — no switcher, no range control, just the empty state. */
export const NoLinkedChildren: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: [],
      activeChildId: null,
      range: RANGE,
      records: [],
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Chưa có con nào được liên kết")).toBeVisible();
    expect(canvas.queryAllByRole("tab")).toHaveLength(0);
    expect(canvas.queryByLabelText("Từ ngày")).toBeNull();
  },
};

/** Children linked, but no attendance session inside the chosen range. */
export const EmptyRange: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: [],
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Không có dữ liệu điểm danh")).toBeVisible();
    // the switcher + range control stay available so the parent can adjust
    expect(canvas.getAllByRole("tab")).toHaveLength(2);
  },
};

/**
 * `403 ATTENDANCE_FORBIDDEN` — the parent is not linked to the requested child
 * (US-E18.34 replaced US-E20.5's placeholder degrade with the BE's real answer;
 * the UI state is unchanged). Honest copy and NO retry control — a retry can
 * never fix a 403.
 */
export const ErrorForbidden: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: [],
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: "forbidden",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("alert")).toBeVisible();
    expect(canvas.queryByRole("button", { name: "Thử lại" })).toBeNull();
  },
};

export const ErrorNetworkRetry: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: [],
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: "network-error",
    },
    onRetry: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Thử lại" }));
    expect(args.onRetry).toHaveBeenCalled();
  },
};

/**
 * Over the BE's 366-day cap. Same treatment as the inverted range (a11y audit
 * Minor, fix round): the two inputs that CAUSED the failure are `aria-invalid`
 * and `aria-describedby` the alert, so the reason is announced, not just tinted.
 */
export const ErrorRangeTooLarge: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: { startDate: "2024-01-01", endDate: "2026-08-31" },
      records: [],
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: "date-range-too-large",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const label of ["Từ ngày", "Đến ngày"]) {
      const input = canvas.getByLabelText(label);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "pa-range-error");
      expect(input).toHaveAccessibleDescription(/không được vượt quá 366 ngày/);
    }
    expect(canvas.getByRole("alert")).toHaveAttribute("id", "pa-range-error");
    // Terminal failure — no retry affordance.
    expect(canvas.queryByRole("button", { name: "Thử lại" })).toBeNull();
  },
};

/** An inverted range: the inputs are marked invalid and point at the message. */
export const ErrorInvalidRange: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: { startDate: "2026-08-31", endDate: "2026-08-01" },
      records: [],
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: "invalid-date-range",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByLabelText("Từ ngày");
    expect(start).toHaveAttribute("aria-invalid", "true");
    expect(start).toHaveAttribute("aria-describedby", "pa-range-error");
    const alert = canvas.getByRole("alert");
    expect(alert).toHaveAttribute("id", "pa-range-error");
    // range failures are terminal — no retry affordance
    expect(canvas.queryByRole("button", { name: "Thử lại" })).toBeNull();
  },
};

/* ── US-E24.6 — "Xin phép nghỉ học" ─────────────────────────────────────── */

const mLeave = messages.discipline.studentConduct.leaveRequest;
const mParent = messages.parentAttendance;

/** A still-SUBMITTED request of the selected child. */
const PENDING_REQUEST: LeaveRequestEntity = {
  id: "lr-9",
  studentId: "c1",
  studentName: "Nguyễn Minh Khoa",
  initials: "NK",
  avatarTone: "primary",
  classId: "cls-11a2",
  className: "11A2",
  submittedBy: "parent",
  submitterName: "Nguyễn Văn A",
  reason: "Việc gia đình",
  startDate: "10/09/2026",
  endDate: "12/09/2026",
  dayCount: 3,
  type: "other",
  status: "pending",
  submittedAt: "2026-09-06T02:00:00Z",
  approvedBy: null,
  rejectedBy: null,
  rejectionReason: null,
};

const leaveArgs = {
  onChildSwitch: fn(),
  onRangeChange: fn(),
  onRetry: fn(),
  onSubmitted: fn(),
};

/** AC: the header button opens the dialog and submits the 5-field payload. */
export const RequestLeaveDialog: Story = {
  args: {
    ...leaveArgs,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: RECORDS,
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: null,
    },
    onSubmitLeave: fn(async () => ({
      ok: true as const,
      requestId: "req-1",
      total: 0,
      failedCount: 0,
    })),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const trigger = canvas.getByRole("button", {
      name: mParent.requestLeaveButton,
    });
    await userEvent.click(trigger);

    const dialog = await body.findByRole("dialog");
    // The child being requested for is named, not implied.
    await expect(dialog).toHaveTextContent("Nguyễn Minh Khoa");

    await userEvent.type(body.getByLabelText(mLeave.reason), "Ốm");
    await userEvent.click(
      body.getByRole("button", { name: new RegExp(mLeave.submit) }),
    );

    await expect(args.onSubmitLeave).toHaveBeenCalledTimes(1);
    const [input] = (
      args.onSubmitLeave as unknown as {
        mock: { calls: [Record<string, string>, FormData][] };
      }
    ).mock.calls[0];
    // The class is the one read off the attendance rows — never asked of the user.
    expect(input).toEqual({
      studentMemberId: "c1",
      classId: "cls-11a2",
      startDate: TODAY,
      endDate: TODAY,
      reason: "Ốm",
    });
    // Success closes the dialog and re-fetches so the pending row appears.
    await expect(args.onSubmitted).toHaveBeenCalled();
  },
};

/**
 * AC: a partial ATTACHMENT failure must NOT read as a failed submission — the
 * request exists, so the screen says N/M and offers a files-only retry.
 */
export const AttachmentsPartialFailure: Story = {
  args: {
    ...leaveArgs,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: RECORDS,
      leaveRequests: [],
      childClassId: "cls-11a2",
      today: TODAY,
      error: null,
    },
    onSubmitLeave: fn(async () => ({
      ok: true as const,
      requestId: "req-1",
      total: 2,
      failedCount: 1,
    })),
    onRetryAttachments: fn(async () => ({
      ok: true as const,
      total: 2,
      failedCount: 0,
    })),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", { name: mParent.requestLeaveButton }),
    );
    await body.findByRole("dialog");
    await userEvent.type(body.getByLabelText(mLeave.reason), "Ốm");
    await userEvent.click(
      body.getByRole("button", { name: new RegExp(mLeave.submit) }),
    );

    // A live region states exactly how many files failed…
    const notice = await canvas.findByRole("status");
    await expect(notice).toHaveTextContent(
      mParent.submitPartial.replace("{failed}", "1").replace("{total}", "2"),
    );

    // …and the retry re-uploads to the SAME request (no second submission).
    await userEvent.click(
      within(notice).getByRole("button", { name: mParent.retryAttachments }),
    );
    await expect(args.onRetryAttachments).toHaveBeenCalledTimes(1);
    await expect(
      (args.onRetryAttachments as unknown as { mock: { calls: string[][] } })
        .mock.calls[0][0],
    ).toBe("req-1");
    await expect(args.onSubmitLeave).toHaveBeenCalledTimes(1);
  },
};

/** A SUBMITTED request shows as the first "Chờ duyệt" row of the history. */
export const PendingRow: Story = {
  args: {
    ...leaveArgs,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: RECORDS,
      leaveRequests: [PENDING_REQUEST],
      childClassId: "cls-11a2",
      today: TODAY,
      error: null,
    },
    onSubmitLeave: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const history = within(
      canvas.getByRole("region", {
        name: messages.attendanceSummary.historyTitle,
      }),
    );
    const rows = history.getAllByRole("listitem");
    await expect(rows[0]).toHaveTextContent(
      messages.attendanceSummary.statusPending,
    );
    await expect(rows[0]).toHaveTextContent(PENDING_REQUEST.reason);
  },
};

/**
 * AC/packet Q3: with no attendance row in the range there is no `classId`, so a
 * request cannot be filed — the button explains itself instead of failing on
 * submit.
 */
export const LeaveUnavailableWithoutClass: Story = {
  args: {
    ...leaveArgs,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: [],
      leaveRequests: [],
      childClassId: null,
      today: TODAY,
      error: null,
    },
    onSubmitLeave: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const trigger = canvas.getByRole("button", {
      name: mParent.requestLeaveButton,
    });
    // aria-disabled, not `disabled`: the explanation must stay reachable by
    // keyboard, and it is wired through aria-describedby.
    await expect(trigger).toHaveAttribute("aria-disabled", "true");
    const describedBy = trigger.getAttribute("aria-describedby") ?? "";
    await expect(document.getElementById(describedBy)).toHaveTextContent(
      mParent.requestLeaveUnavailable,
    );

    await userEvent.click(trigger);
    await expect(body.queryByRole("dialog")).toBeNull();
    await expect(args.onSubmitLeave).not.toHaveBeenCalled();
  },
};
