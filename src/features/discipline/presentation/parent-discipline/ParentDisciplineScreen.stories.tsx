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

/** Switching child closes the open form and swaps data (AC-02-03..05). */
export const ParentDisciplineScreen_ChildSwitch_FormReset: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Open the form on c1.
    await userEvent.click(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    );
    await expect(
      canvas.getByRole("heading", { name: "Gửi đơn xin nghỉ" }),
    ).toBeInTheDocument();
    // Switch to c2.
    const tabs = canvas.getAllByRole("tab");
    await userEvent.click(tabs[1]);
    await waitFor(() =>
      expect(
        canvas.queryByRole("heading", { name: "Gửi đơn xin nghỉ" }),
      ).toBeNull(),
    );
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

/** Valid leave submission closes the form and prepends a pending entry (AC-01-03/04). */
export const ParentDisciplineScreen_LeaveForm_Valid: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    );
    const reason = canvas.getByLabelText("Lý do *");
    await userEvent.type(reason, "Con bị ốm cần nghỉ ở nhà điều trị");
    await userEvent.click(canvas.getByRole("button", { name: "Gửi đơn" }));
    await waitFor(() =>
      expect(
        canvas.queryByRole("heading", { name: "Gửi đơn xin nghỉ" }),
      ).toBeNull(),
    );
    // Success banner mentions the GVCN.
    await expect(canvas.getByText(/Nguyễn Thị Hương/)).toBeInTheDocument();
  },
};

/** Validation: short reason blocks submit with an inline error (AC-03). */
export const ParentDisciplineScreen_LeaveForm_Validation: Story = {
  args: {
    ...baseVm,
    childList: [CHILDREN[0]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    );
    const reason = canvas.getByLabelText("Lý do *");
    await userEvent.type(reason, "Ốm");
    await userEvent.click(canvas.getByRole("button", { name: "Gửi đơn" }));
    // Reason error visible; form still open.
    await waitFor(() =>
      expect(
        canvas.getByText("Lý do phải có ít nhất 10 ký tự"),
      ).toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole("heading", { name: "Gửi đơn xin nghỉ" }),
    ).toBeInTheDocument();
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
