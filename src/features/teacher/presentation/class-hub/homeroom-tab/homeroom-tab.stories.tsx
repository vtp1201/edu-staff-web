import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import { HomeroomTab } from "./homeroom-tab";
import type { HomeroomLeaveActions, HomeroomTabVm } from "./homeroom-tab.i-vm";

const RETRY = "/vi/t/t1/teacher/classes/c-1?tab=homeroom";

function leave(over: Partial<LeaveRequestEntity> = {}): LeaveRequestEntity {
  return {
    id: "l-1",
    studentId: "s-30",
    studentName: "Nguyễn Minh Khoa",
    initials: "KN",
    avatarTone: "primary",
    classId: "c-1",
    className: "10A1",
    submittedBy: "parent",
    submitterName: "Nguyễn Văn Đức",
    reason: "Khám bệnh định kỳ tại bệnh viện",
    startDate: "02/09/2026",
    endDate: "03/09/2026",
    dayCount: 2,
    type: "other",
    status: "pending",
    submittedAt: "2026-09-01T08:00:00Z",
    approvedBy: null,
    rejectedBy: null,
    rejectionReason: null,
    ...over,
  };
}

function vm(over: Partial<HomeroomTabVm> = {}): HomeroomTabVm {
  return {
    classId: "c-1",
    attendance: {
      ok: true,
      data: {
        taken: true,
        present: 32,
        excused: 1,
        absent: 1,
        attendanceHref:
          "/vi/t/t1/teacher/attendance?classId=c-1&date=2026-09-02",
      },
    },
    violations: {
      ok: true,
      data: {
        count: 2,
        disciplineHref: "/vi/t/t1/teacher/discipline?classId=c-1",
        items: [
          {
            id: "v-1",
            studentName: "Phạm Đức Dũng",
            description: "Đi học muộn 15 phút",
            dateLabel: "01/09/2026",
          },
          {
            id: "v-2",
            studentName: "Lê Thị Cẩm",
            description: "Sử dụng điện thoại trong giờ học",
            dateLabel: "31/08/2026",
          },
        ],
      },
    },
    leave: {
      ok: true,
      data: {
        requests: [
          leave(),
          leave({
            id: "l-2",
            studentId: "s-31",
            studentName: "Trần Bảo Anh",
            reason: "Tham dự đám cưới anh họ",
          }),
        ],
      },
    },
    ...over,
  };
}

/** Every decision succeeds — the stories exercise the real await→remove path. */
const actions: HomeroomLeaveActions = {
  approveLeave: async () => ({ ok: true }),
  rejectLeave: async () => ({ ok: true }),
};

/** A 403: the GVCN lost the class mid-session (decision 0063's denial). */
const forbiddenActions: HomeroomLeaveActions = {
  approveLeave: async () => ({ ok: false, errorKey: "forbidden" }),
  rejectLeave: async () => ({ ok: false, errorKey: "forbidden" }),
};

const meta = {
  title: "Teacher/ClassHub/HomeroomTab",
  component: HomeroomTab,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
        <Toaster />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof HomeroomTab>;
export default meta;

type Story = StoryObj<typeof meta>;

const t = messages.teacherClasses.hub.homeroom;

/* ── AC: all three cards populated ───────────────────────────────────────── */
export const Full: Story = {
  args: { vm: vm(), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Card 1 — numbers AND their labels are both visible (never colour alone).
    expect(canvas.getByText(t.attendance.taken)).toBeInTheDocument();
    expect(canvas.getByText("32")).toBeInTheDocument();
    expect(canvas.getByText(t.attendance.present)).toBeInTheDocument();

    // Card 2 — the count badge announces itself in words, not just a digit.
    // The wording is REAL (sr-only) text, not an aria-label on a role=generic
    // <span>, where a name is prohibited (A11Y-002).
    expect(
      canvas.getByText(t.violations.countLabel.replace("{count}", "2")),
    ).toBeInTheDocument();

    // Card 3 — one row per pending request, each button naming its student.
    expect(
      canvas.getByLabelText(
        t.leave.approveLabel.replace("{student}", "Nguyễn Minh Khoa"),
      ),
    ).toBeInTheDocument();
  },
};

/* ── AC: "Chưa điểm danh" → all three tiles read "—", never 0 ───────────── */
export const AttendanceNotTaken: Story = {
  args: {
    vm: vm({
      attendance: {
        ok: true,
        data: {
          taken: false,
          present: 0,
          excused: 0,
          absent: 0,
          attendanceHref: "/vi/t/t1/teacher/attendance?classId=c-1",
        },
      },
    }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText(t.attendance.notTaken)).toBeInTheDocument();
    expect(canvas.getAllByText("—")).toHaveLength(3);
    // A bare em-dash is meaningless to a screen reader — the hint carries it.
    expect(canvas.getByText(t.attendance.notTakenHint)).toBeInTheDocument();
    // The zeros must NOT be rendered as real counts.
    expect(canvas.queryByText("0")).not.toBeInTheDocument();
  },
};

/* ── AC: empty states, per card ──────────────────────────────────────────── */
export const EmptyAll: Story = {
  args: {
    vm: vm({
      attendance: {
        ok: true,
        data: {
          taken: true,
          present: 34,
          excused: 0,
          absent: 0,
          attendanceHref: "/vi/t/t1/teacher/attendance?classId=c-1",
        },
      },
      violations: {
        ok: true,
        data: {
          items: [],
          count: 0,
          disciplineHref: "/vi/t/t1/teacher/discipline?classId=c-1",
        },
      },
      leave: { ok: true, data: { requests: [] } },
    }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText(t.violations.empty)).toBeInTheDocument();
    expect(canvas.getByText(t.leave.empty)).toBeInTheDocument();
    // A rolled day with zero absences still shows REAL zeros, not "—":
    // two attendance tiles (Có phép, Vắng) + both empty count badges.
    expect(canvas.getByText(t.attendance.taken)).toBeInTheDocument();
    expect(canvas.getAllByText("0")).toHaveLength(4);
    expect(canvas.queryByText("—")).not.toBeInTheDocument();
  },
};

/* ── AC: Duyệt → the row leaves the inbox ────────────────────────────────── */
export const ApproveRemovesRow: Story = {
  args: { vm: vm(), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByLabelText(
        t.leave.approveLabel.replace("{student}", "Nguyễn Minh Khoa"),
      ),
    );

    await waitFor(() => {
      expect(canvas.queryByText("Nguyễn Minh Khoa")).not.toBeInTheDocument();
    });
    // The other request is untouched and the badge counts down.
    expect(canvas.getByText("Trần Bảo Anh")).toBeInTheDocument();
    expect(
      canvas.getByText(t.leave.countLabel.replace("{count}", "1")),
    ).toBeInTheDocument();

    // A11Y: the focused button was just unmounted with its row — focus must
    // land on the card heading, never fall through to <body> (WCAG 2.4.3).
    const heading = canvas.getByRole("heading", { name: t.leave.title });
    await waitFor(() => expect(heading).toHaveFocus());
  },
};

/* ── AC: Từ chối — reason required, then the row leaves the inbox ───────── */
export const RejectDialog: Story = {
  args: { vm: vm(), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialogCopy = messages.discipline.leave.rejectDialog;

    await userEvent.click(
      canvas.getByLabelText(
        t.leave.rejectLabel.replace("{student}", "Nguyễn Minh Khoa"),
      ),
    );

    const dialog = within(await within(document.body).findByRole("dialog"));
    const confirm = dialog.getByRole("button", { name: dialogCopy.confirm });

    // AC: no reason → cannot confirm (keyboard users included, hence disabled).
    expect(confirm).toBeDisabled();

    await userEvent.type(
      dialog.getByLabelText(dialogCopy.reason),
      "Đã nghỉ quá 5 ngày trong tháng này",
    );
    await waitFor(() => expect(confirm).toBeEnabled());
    await userEvent.click(confirm);

    await waitFor(() => {
      expect(canvas.queryByText("Nguyễn Minh Khoa")).not.toBeInTheDocument();
    });

    // A11Y: the dialog's own focus return points at the (now removed) Từ chối
    // button, so the card heading is the declared fallback. The query itself
    // is retried: until the dialog's exit animation finishes, Radix keeps the
    // rest of the page out of the accessibility tree.
    await waitFor(
      () =>
        expect(
          canvas.getByRole("heading", { name: t.leave.title }),
        ).toHaveFocus(),
      { timeout: 4000 },
    );
  },
};

/* ── AC: 403 → the row STAYS and the buttons come back enabled ──────────── */
export const ForbiddenKeepsRow: Story = {
  args: { vm: vm(), actions: forbiddenActions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const approve = canvas.getByLabelText(
      t.leave.approveLabel.replace("{student}", "Nguyễn Minh Khoa"),
    );

    await userEvent.click(approve);

    // Nothing was decided, so nothing may disappear…
    await waitFor(() =>
      expect(
        within(document.body).getByText(messages.discipline.errors.forbidden),
      ).toBeInTheDocument(),
    );
    expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    // …and the teacher must be able to try again (regression guard for the
    // stuck-pending async-transition bug, US-E21.2).
    await waitFor(() => expect(approve).toBeEnabled());
  },
};

/* ── AC: one dead read costs exactly ONE card ───────────────────────────── */
export const ErrorCard: Story = {
  args: {
    vm: vm({ leave: { ok: false, retryHref: RETRY } }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText(t.errors.leave)).toBeInTheDocument();
    const retry = canvas.getByRole("link", { name: t.errors.retry });
    // Retry is a real navigation back to the same tab — no client JS needed.
    expect(retry).toHaveAttribute("href", RETRY);

    // The other two cards rendered normally.
    expect(canvas.getByText(t.attendance.title)).toBeInTheDocument();
    expect(canvas.getByText("Phạm Đức Dũng")).toBeInTheDocument();
  },
};

/* ── STATE-DESIGN: the content-derived remount key ──────────────────────── */

/** Stands in for the RSC re-render a `router.refresh()` produces: the SAME
 *  mounted `HomeroomTab` receives a new `vm` whose leave id set differs. */
function ResyncHarness() {
  const [current, setCurrent] = useState(vm());
  return (
    <>
      <button
        type="button"
        onClick={() =>
          setCurrent(
            vm({
              leave: {
                ok: true,
                data: {
                  requests: [
                    leave({
                      id: "l-9",
                      studentId: "s-99",
                      studentName: "Vũ Hà My",
                    }),
                  ],
                },
              },
            }),
          )
        }
      >
        server-change
      </button>
      <HomeroomTab vm={current} actions={actions} />
    </>
  );
}

export const ResyncAfterServerChange: Story = {
  args: { vm: vm(), actions },
  render: () => <ResyncHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();

    // A concurrent decision elsewhere: the server now reports a DIFFERENT id
    // set. New props alone would NOT reseed `PendingLeaveCard`'s `useState`
    // (same component type, same slot) — the content-derived key is what makes
    // the refetch visible.
    await userEvent.click(
      canvas.getByRole("button", { name: "server-change" }),
    );

    await waitFor(() => {
      expect(canvas.getByText("Vũ Hà My")).toBeInTheDocument();
    });
    expect(canvas.queryByText("Nguyễn Minh Khoa")).not.toBeInTheDocument();
  },
};
