import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import {
  MOCK_MY_CONDUCT,
  MOCK_MY_LEAVE_REQUESTS,
  MOCK_MY_VIOLATIONS,
} from "../../infrastructure/repositories/mocks/fixtures";
import { StudentConductScreen } from "./student-conduct-screen";
import type { StudentConductScreenVM } from "./student-conduct-screen.i-vm";

const noop = async () => ({});

const baseVm: StudentConductScreenVM = {
  viewerRole: "student",
  conductSummary: MOCK_MY_CONDUCT,
  violations: MOCK_MY_VIOLATIONS,
  leaveRequests: MOCK_MY_LEAVE_REQUESTS,
  submitLeaveRequestAction: noop,
};

const rejectedLeave = [
  {
    ...MOCK_MY_LEAVE_REQUESTS[0],
    id: "l-rej",
    status: "rejected" as const,
    rejectionReason: "Học sinh đã nghỉ quá số ngày cho phép trong tháng",
  },
];

const meta: Meta<typeof StudentConductScreen> = {
  title: "Features/Discipline/StudentConductScreen",
  component: StudentConductScreen,
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

type Story = StoryObj<typeof StudentConductScreen>;

/** Skeleton while the RSC streams initial data (AC-1). */
export const Loading: Story = {
  args: { ...baseVm, isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Hành kiểm của tôi" }),
    ).toBeInTheDocument();
  },
};

/** Student with violations + a pending and an approved leave (AC-2, AC-3, AC-5). */
export const StudentWithViolations: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Conduct grade badge (good = Khá).
    await expect(canvas.getByText("Khá")).toBeInTheDocument();
    // Violation type label present.
    await expect(canvas.getByText("Đi học muộn")).toBeInTheDocument();
    // Leave statuses present.
    await expect(canvas.getByText("Chờ duyệt")).toBeInTheDocument();
    await expect(canvas.getByText("Đã duyệt")).toBeInTheDocument();
    // Request-leave CTA available.
    await expect(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    ).toBeInTheDocument();
  },
};

/** No violations + empty leave history (AC-7). */
export const StudentEmptyViolations: Story = {
  args: { ...baseVm, violations: [], leaveRequests: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Chưa có vi phạm nào")).toBeInTheDocument();
    await expect(
      canvas.getByText("Chưa có đơn xin nghỉ nào"),
    ).toBeInTheDocument();
  },
};

/** Rejected leave shows the rejection reason (AC-5). */
export const LeaveHistoryWithRejection: Story = {
  args: { ...baseVm, leaveRequests: rejectedLeave },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Từ chối")).toBeInTheDocument();
    await expect(canvas.getByText("Lý do từ chối:")).toBeInTheDocument();
  },
};

/** Parent view shows the child's name + class in the header (AC-6). */
export const ParentView: Story = {
  args: {
    ...baseVm,
    viewerRole: "parent",
    childName: "Trần Văn Bình",
    childClass: "11B2",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Hành kiểm học sinh" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("Trần Văn Bình — Lớp 11B2"),
    ).toBeInTheDocument();
  },
};

/**
 * The leave CTA opens the canonical `LeaveRequestDialog` (AC-4, AC-9).
 *
 * US-E24.20 (backlog #12) replaced the bespoke Sheet form with the shared
 * dialog: no leave-TYPE control (core has no such concept), no attachment
 * picker (no upload use-case on this path), and submit is blocked while the
 * reason is EMPTY instead of by a bespoke 10-character rule.
 */
export const LeaveRequestForm: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Xin nghỉ phép" }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    // Labels are linked to inputs (a11y).
    await expect(dialog.getByLabelText(/Ngày bắt đầu/)).toBeInTheDocument();
    await expect(dialog.getByLabelText(/Lý do/)).toBeInTheDocument();
    // No leave-type select, no attachment picker.
    await expect(dialog.queryByRole("combobox")).toBeNull();
    await expect(dialog.queryByText("Loại nghỉ *")).toBeNull();
    await expect(document.body.querySelector('input[type="file"]')).toBeNull();
    // Empty reason blocks submit and says why.
    const submit = dialog.getByRole("button", { name: /Gửi đơn/ });
    await expect(submit).toBeDisabled();
    await expect(
      dialog.getByText("Vui lòng nhập lý do nghỉ."),
    ).toBeInTheDocument();
    await userEvent.type(dialog.getByLabelText(/Lý do/), "Ốm");
    await waitFor(() => expect(submit).toBeEnabled());
  },
};

/** Initial fetch failed — error banner with retry (AC-8). */
export const ErrorState: Story = {
  args: {
    ...baseVm,
    conductSummary: null,
    loadErrorKey: "network-error",
    onRetry: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};
