import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import {
  MOCK_CONDUCT,
  MOCK_LEAVE_REQUESTS,
  MOCK_VIOLATIONS,
} from "../../infrastructure/repositories/mocks/fixtures";
import { DisciplineScreen } from "./discipline-screen";
import type { DisciplineScreenVM } from "./discipline-screen.i-vm";

const noop = async () => ({});

const baseVm: DisciplineScreenVM = {
  viewerRole: "teacher",
  availableClasses: ["10A1", "11B2", "12C1"],
  initialTab: "violations",
  initialSemester: "HK1 2025–2026",
  violations: MOCK_VIOLATIONS,
  conductSummary: MOCK_CONDUCT,
  leaveRequests: MOCK_LEAVE_REQUESTS,
  recordViolationAction: noop,
  approveLeaveAction: noop,
  rejectLeaveAction: noop,
  overrideConductGradeAction: noop,
  onTabChange: () => {},
};

const meta: Meta<typeof DisciplineScreen> = {
  title: "Features/Discipline/DisciplineScreen",
  component: DisciplineScreen,
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

type Story = StoryObj<typeof DisciplineScreen>;

/** Skeleton while the RSC streams initial data (AC-1). */
export const Loading: Story = {
  args: { ...baseVm, isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Kỷ luật|Hành chính/ }),
    ).toBeInTheDocument();
  },
};

/** Teacher view of the violations tab — list + record CTA visible. */
export const ViolationsTab_Teacher: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Trần Văn Bình")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Nhập vi phạm mới" }),
    ).toBeInTheDocument();
    // High-severity label present (Nặng).
    await expect(canvas.getAllByText("Nặng").length).toBeGreaterThan(0);
  },
};

/** Principal view — no record CTA (read across all classes). */
export const ViolationsTab_Principal: Story = {
  args: { ...baseVm, viewerRole: "principal" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Nhập vi phạm mới" }),
    ).not.toBeInTheDocument();
  },
};

/** Empty violations list shows the success-style empty state (AC-7). */
export const ViolationsTab_Empty: Story = {
  args: { ...baseVm, violations: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Không có vi phạm nào!")).toBeInTheDocument();
  },
};

/** Conduct tab — grade summary + table with override. */
export const ConductTab: Story = {
  args: { ...baseVm, initialTab: "conduct" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Sửa hạnh kiểm của/ }),
    ).toBeInTheDocument();
  },
};

/** Leave tab — at least one pending request with approve/reject controls. */
export const LeaveTab_WithPending: Story = {
  args: { ...baseVm, initialTab: "leave" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByRole("button", { name: /Duyệt đơn nghỉ của/ }).length,
    ).toBeGreaterThan(0);
  },
};

/** Leave tab opens the reject dialog and enforces the 10-char minimum reason (AC-6). */
export const LeaveTab_Reject: Story = {
  args: { ...baseVm, initialTab: "leave" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [rejectBtn] = canvas.getAllByRole("button", {
      name: /Từ chối đơn nghỉ của/,
    });
    await userEvent.click(rejectBtn);
    const dialog = within(await within(document.body).findByRole("dialog"));
    const confirm = dialog.getByRole("button", { name: "Xác nhận từ chối" });
    await expect(confirm).toBeDisabled();
    await userEvent.type(
      dialog.getByLabelText(/Nhập lý do từ chối/),
      "Lý do từ chối đủ dài",
    );
    await waitFor(() => expect(confirm).toBeEnabled());
  },
};

/** Empty leave list. */
export const LeaveTab_Empty: Story = {
  args: { ...baseVm, initialTab: "leave", leaveRequests: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Chưa có yêu cầu nghỉ phép"),
    ).toBeInTheDocument();
  },
};

/** Initial fetch failed — error banner with retry (AC-8). */
export const ErrorState: Story = {
  args: { ...baseVm, loadErrorKey: "network-error", onRetry: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};
