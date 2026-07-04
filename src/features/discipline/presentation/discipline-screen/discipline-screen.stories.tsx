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
    // Open the record form and exercise its controls (AC-4).
    await userEvent.click(
      canvas.getByRole("button", { name: "Nhập vi phạm mới" }),
    );
    await expect(canvas.getByLabelText(/Tên học sinh/i)).toBeInTheDocument();
    await expect(
      canvas.getByRole("switch", { name: /Thông báo phụ huynh/i }),
    ).toBeInTheDocument();
    // Submit stays disabled while the student name is empty.
    await expect(
      canvas.getByRole("button", { name: /Ghi nhận vi phạm/i }),
    ).toBeDisabled();
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

/**
 * Empty violations list shows the canonical empty state (AC-01.1–01.6,
 * AC-01.9): role="status", ShieldOff icon (aria-hidden), no CTA, and the
 * misleading text-edu-success/<Check> anti-pattern is gone (US-E17.4).
 */
export const ViolationsTab_Empty: Story = {
  args: { ...baseVm, violations: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status");
    await expect(status).toBeInTheDocument();
    await expect(canvas.getByText("Không có vi phạm nào!")).toBeInTheDocument();
    const svg = status.querySelector("svg");
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    // A11Y-001: icon color is text-edu-text-secondary, not the old
    // text-edu-text-muted / text-edu-success anti-pattern.
    await expect(svg?.getAttribute("class") ?? "").toContain(
      "text-edu-text-secondary",
    );
    await expect(status.querySelector(".text-edu-success")).toBeNull();
    await expect(status.querySelector("button")).toBeNull();
    await expect(status.querySelector("h2")).toBeNull();
    await expect(status.querySelector("h3")).toBeNull();
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

/**
 * Empty conduct summary shows the canonical empty state (AC-02.1–02.4) —
 * previously untested (US-E17.4 coverage gap fix): ClipboardList icon,
 * role="status", no CTA.
 */
export const ConductTab_Empty: Story = {
  args: { ...baseVm, initialTab: "conduct", conductSummary: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status");
    await expect(status).toBeInTheDocument();
    await expect(
      canvas.getByText("Chưa có dữ liệu hạnh kiểm"),
    ).toBeInTheDocument();
    const svg = status.querySelector("svg");
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg?.getAttribute("class") ?? "").toContain(
      "text-edu-text-secondary",
    );
    await expect(status.querySelector("button")).toBeNull();
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

/**
 * Empty leave list shows the canonical empty state (AC-03.1–03.4, AC-03.7):
 * role="status", CalendarOff icon (aria-hidden), no CTA.
 */
export const LeaveTab_Empty: Story = {
  args: { ...baseVm, initialTab: "leave", leaveRequests: [] },
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
    await expect(status.querySelector(".text-edu-success")).toBeNull();
    await expect(status.querySelector("button")).toBeNull();
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

// US-E17.1 AC-10/AC-11: at 375px the tab's stat grid uses the auto-fit
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

/** AC-11: violations tab (default initialTab) stat grid at 375px. */
export const Viewport375: Story = {
  args: baseVm,
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

/**
 * AC-10: Conduct tab stat grid at 375px. `Viewport375` above only mounts the
 * violations tab (baseVm.initialTab === "violations"); Radix Tabs unmounts
 * inactive panels, so it never renders the Conduct tab's grid. This story
 * closes that gap (found by fe-qa-playwright).
 */
export const Viewport375_ConductTab: Story = {
  args: { ...baseVm, initialTab: "conduct" },
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
