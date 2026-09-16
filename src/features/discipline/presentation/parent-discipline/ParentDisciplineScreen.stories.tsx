import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ChildEntity } from "../../domain/entities/child.entity";
import type { ConductSummaryEntity } from "../../domain/entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "../../domain/entities/leave-request.entity";
import type { ViolationEntity } from "../../domain/entities/violation.entity";
import { ParentDisciplineScreen } from "./ParentDisciplineScreen";
import type { ParentDisciplineScreenVM } from "./parent-discipline-screen.i-vm";

const CHILDREN: ChildEntity[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    className: "11A2",
    avatar: "NK",
    avatarColor: "#5D87FF",
    gvcnName: "Nguyễn Thị Hương",
  },
  {
    childId: "c2",
    name: "Nguyễn Thu Hà",
    className: "8B1",
    avatar: "NH",
    avatarColor: "#13DEB9",
    gvcnName: "Trần Bích Vân",
  },
];

const CONDUCT_C1: ConductSummaryEntity = {
  studentId: "c1",
  studentName: "Nguyễn Minh Khoa",
  initials: "NK",
  avatarTone: "primary",
  classId: "11A2",
  className: "11A2",
  violationCount: 2,
  unexcusedAbsences: 1,
  points: 82,
  grade: "good",
  isOverridden: false,
  overrideNote: null,
  semester: "HK1",
};

const CONDUCT_C2: ConductSummaryEntity = {
  ...CONDUCT_C1,
  studentId: "c2",
  studentName: "Nguyễn Thu Hà",
  className: "8B1",
  violationCount: 0,
  unexcusedAbsences: 0,
  points: 94,
  grade: "excellent",
};

const VIOLATIONS_C1: ViolationEntity[] = [
  {
    id: "cv-1",
    studentId: "c1",
    studentName: "Nguyễn Minh Khoa",
    initials: "NK",
    avatarTone: "primary",
    classId: "11A2",
    className: "11A2",
    type: "late",
    date: "2026-05-12",
    period: 1,
    description: "Vào lớp muộn 10 phút",
    severity: "low",
    handledBy: "Nguyễn Thị Hương",
    status: "notified",
  },
  {
    id: "cv-2",
    studentId: "c1",
    studentName: "Nguyễn Minh Khoa",
    initials: "NK",
    avatarTone: "primary",
    classId: "11A2",
    className: "11A2",
    type: "phone",
    date: "2026-05-04",
    period: 3,
    description: "Sử dụng điện thoại trong giờ học",
    severity: "medium",
    handledBy: "Trần Văn Minh",
    status: "parent_confirmed",
  },
];

const LEAVE_C1: LeaveRequestEntity[] = [
  {
    id: "cl-1",
    studentId: "c1",
    studentName: "Nguyễn Minh Khoa",
    initials: "NK",
    avatarTone: "primary",
    classId: "11A2",
    className: "11A2",
    submittedBy: "parent",
    submitterName: "Nguyễn Văn Đức (Phụ huynh)",
    reason: "Khám sức khỏe định kỳ tại bệnh viện tỉnh",
    startDate: "10/05/2026",
    endDate: "10/05/2026",
    dayCount: 1,
    type: "medical",
    status: "approved",
    submittedAt: "08/05/2026 19:00",
    approvedBy: "Nguyễn Thị Hương",
    rejectedBy: null,
    rejectionReason: null,
  },
];

const LEAVE_WITH_REJECTION: LeaveRequestEntity[] = [
  {
    ...LEAVE_C1[0],
    id: "cl-pending",
    status: "pending",
    approvedBy: null,
  },
  ...LEAVE_C1,
  {
    ...LEAVE_C1[0],
    id: "cl-rejected",
    reason: "Gia đình có việc đột xuất",
    status: "rejected",
    approvedBy: null,
    rejectedBy: "Trần Bích Vân",
    rejectionReason: "Học sinh đã nghỉ quá 5 ngày trong tháng",
  },
];

const noopSubmit = async () => ({});
const conductAction = async (childId: string) => ({
  data: childId === "c2" ? CONDUCT_C2 : CONDUCT_C1,
});
const violationsAction = async (childId: string) => ({
  data: childId === "c2" ? [] : VIOLATIONS_C1,
});
const leaveAction = async (childId: string) => ({
  data: childId === "c2" ? LEAVE_WITH_REJECTION : LEAVE_C1,
});

const baseVm: ParentDisciplineScreenVM = {
  childList: CHILDREN,
  initialChildId: "c1",
  initialConduct: CONDUCT_C1,
  initialViolations: VIOLATIONS_C1,
  initialLeaveRequests: LEAVE_C1,
  submitChildLeaveRequestAction: noopSubmit,
  getChildConductAction: conductAction,
  getChildViolationsAction: violationsAction,
  getChildLeaveRequestsAction: leaveAction,
};

const meta: Meta<typeof ParentDisciplineScreen> = {
  title: "Features/Discipline/ParentDisciplineScreen",
  component: ParentDisciplineScreen,
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

type Story = StoryObj<typeof ParentDisciplineScreen>;

const REC_VIOLATION = "Ghi nhận vi phạm";

/** Skeleton while data loads (AC-05-01, AC-05-05). */
export const ParentDisciplineScreen_Loading: Story = {
  args: { ...baseVm, isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByTestId("parent-discipline-skeleton"),
    ).toBeInTheDocument();
    // No violation rows while loading.
    await expect(canvas.queryByText("Vào lớp muộn 10 phút")).toBeNull();
  },
};

/** Single child: no tablist, conduct + read-only enforcement (AC-01, AC-07). */
export const ParentDisciplineScreen_SingleChild: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("tablist")).toBeNull();
    await expect(canvas.getByText("82")).toBeInTheDocument();
    await expect(canvas.getByText("Khá")).toBeInTheDocument();
    await expect(canvas.queryByText(REC_VIOLATION)).toBeNull();
  },
};

/** Two children: tablist with two pills, c1 active (AC-02-01, AC-02-02). */
export const ParentDisciplineScreen_MultiChild: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("tablist")).toBeInTheDocument();
    const tabs = canvas.getAllByRole("tab");
    await expect(tabs).toHaveLength(2);
    await expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    await expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  },
};

/** Switching child closes the open dialog and swaps data (AC-02-03..05). */
export const ParentDisciplineScreen_ChildSwitch_FormReset: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    // Open the dialog on c1 — the background is inert while it is open.
    await userEvent.click(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    );
    await expect(await body.findByRole("dialog")).toBeInTheDocument();
    await expect(canvas.queryAllByRole("tab")).toHaveLength(0);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());

    // Switch to c2 — still no dialog, and the draft did not survive.
    const tabs = canvas.getAllByRole("tab");
    await userEvent.click(tabs[1]);
    await expect(body.queryByRole("dialog")).toBeNull();
    // c2 data: excellent grade + score 94.
    await waitFor(() => expect(canvas.getByText("94")).toBeInTheDocument());
    await expect(canvas.getByText("Tốt")).toBeInTheDocument();
  },
};

/** Empty violations: shield-check empty state, no record button (AC-01-06, AC-07-01). */
export const ParentDisciplineScreen_EmptyViolations: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
    initialViolations: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Chưa có vi phạm nào")).toBeInTheDocument();
    await expect(canvas.queryByText("Vào lớp muộn 10 phút")).toBeNull();
    await expect(canvas.queryByText(REC_VIOLATION)).toBeNull();
  },
};

/** Valid leave submission closes the dialog, shows success banner, and prepends a pending entry (AC-01-03/04). */
export const ParentDisciplineScreen_LeaveForm_Valid: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    );
    await body.findByRole("dialog");
    const reason = body.getByLabelText("Lý do *");
    await userEvent.type(reason, "Con bị ốm cần nghỉ ở nhà điều trị");
    await userEvent.click(body.getByRole("button", { name: /Gửi đơn/ }));
    // Dialog closes after submit.
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    // Success banner mentions the GVCN (DEF-E09.4-002 assertion).
    await expect(canvas.getByText(/Nguyễn Thị Hương/)).toBeInTheDocument();
    // Optimistic pending entry prepended to history list (DEF-E09.4-002 gap fix).
    await waitFor(() =>
      expect(canvas.getByText("Chờ duyệt")).toBeInTheDocument(),
    );
  },
};

/**
 * Validation (AC-03), US-E24.20 shape: the canonical dialog blocks submit while
 * the reason is EMPTY and says why — the old bespoke 10-character client rule is
 * gone (core enforces `minLength: 1`; a too-short reason now surfaces through
 * the server `errorMessage` path like every other failure).
 */
export const ParentDisciplineScreen_LeaveForm_Validation: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    );
    await body.findByRole("dialog");
    await expect(body.getByRole("button", { name: /Gửi đơn/ })).toBeDisabled();
    await expect(
      body.getByText("Vui lòng nhập lý do nghỉ."),
    ).toBeInTheDocument();
    // Typing anything non-empty unblocks it; the dialog stays open.
    await userEvent.type(body.getByLabelText("Lý do *"), "Ốm");
    await waitFor(() =>
      expect(body.getByRole("button", { name: /Gửi đơn/ })).toBeEnabled(),
    );
    await expect(body.getByRole("dialog")).toBeInTheDocument();
  },
};

/**
 * Empty leave-requests history for the selected child shows the canonical
 * empty state (AC-04.1–04.4): role="status", CalendarOff icon (aria-hidden),
 * no CTA, using the shared `discipline.leave.empty` key (parity with the
 * teacher-side tab) — previously untested (US-E17.4 coverage gap fix).
 */
export const ParentDisciplineScreen_EmptyLeaveRequests: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
    initialLeaveRequests: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status");
    await expect(status).toBeInTheDocument();
    await expect(
      canvas.getByText("Chưa có yêu cầu nghỉ phép"),
    ).toBeInTheDocument();
    const svg = status.querySelector("svg");
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg?.getAttribute("class") ?? "").toContain(
      "text-edu-text-secondary",
    );
    await expect(status.querySelector("button")).toBeNull();
    // Populated conduct + violations sections still render alongside the
    // empty leave history (only the leave section is empty).
    await expect(canvas.getByText("82")).toBeInTheDocument();
  },
};

/** Leave history shows rejection reason only on the rejected row (AC-04). */
export const ParentDisciplineScreen_LeaveHistoryWithRejection: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
    initialLeaveRequests: LEAVE_WITH_REJECTION,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Học sinh đã nghỉ quá 5 ngày trong tháng"),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Từ chối")).toBeInTheDocument();
    await expect(canvas.getByText("Đã duyệt")).toBeInTheDocument();
    await expect(canvas.getByText("Chờ duyệt")).toBeInTheDocument();
    // No cancel/withdraw affordance on any row.
    await expect(
      canvas.queryByRole("button", { name: /Huỷ|Thu hồi/ }),
    ).toBeNull();
  },
};

/** Section error with a retry button (AC-05-02, AC-05-03). */
export const ParentDisciplineScreen_ErrorState: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
    initialConduct: null,
    initialViolations: [],
    initialLeaveRequests: [],
    loadErrorKey: "network-error",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không tải được dữ liệu hành kiểm"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};

/**
 * A back-dated request is unreachable (AC-03, DEF-E09.4-003): the canonical
 * dialog puts TODAY on both date inputs' `min`, so the picker never offers a
 * past day. US-E24.20 also removed the leave-TYPE control and the attachment
 * picker from this path — asserted here so neither silently comes back.
 */
export const ParentDisciplineScreen_LeaveForm_NoPastDate_NoType: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await userEvent.click(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    );
    await body.findByRole("dialog");

    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await expect(body.getByLabelText("Ngày bắt đầu *")).toHaveAttribute(
      "min",
      iso,
    );

    // No leave-type select (core has no such concept) …
    await expect(body.queryByRole("combobox")).toBeNull();
    await expect(body.queryByText("Loại nghỉ *")).toBeNull();
    // … and no attachment picker (no upload use-case on this path).
    await expect(document.body.querySelector('input[type="file"]')).toBeNull();
  },
};

/** Read-only enforcement: lock indicator, no record/edit/cancel anywhere (AC-07). */
export const ParentDisciplineScreen_ReadOnlyEnforcement: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(REC_VIOLATION)).toBeNull();
    await expect(canvas.getByText("Chỉ xem")).toBeInTheDocument();
    // No edit/delete on violation rows, no cancel on leave rows.
    await expect(
      canvas.queryByRole("button", { name: /Sửa|Xoá|Xóa/ }),
    ).toBeNull();
    await expect(canvas.queryByRole("button", { name: /Thu hồi/ })).toBeNull();
  },
};
