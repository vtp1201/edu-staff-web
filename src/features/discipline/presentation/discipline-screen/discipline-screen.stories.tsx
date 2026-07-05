import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import {
  MOCK_CONDUCT,
  MOCK_LEAVE_REQUESTS,
  MOCK_VIOLATIONS,
} from "../../infrastructure/repositories/mocks/fixtures";
import { DisciplineScreen } from "./discipline-screen";
import type { DisciplineScreenVM } from "./discipline-screen.i-vm";

const noop = async () => ({});

/**
 * US-E17.11: `@storybook/addon-viewport` is not installed, so the
 * `parameters.viewport` blocks in this file are inert decoration. To prove the
 * 44px touch-target floor at a REAL 375px viewport we drive the
 * `@vitest/browser-playwright` context directly via `page.viewport()` (same
 * pattern as grade-book-table.stories.tsx's TouchTarget_Mobile375).
 */
async function resizeToMobile() {
  const { page } = await import("vitest/browser");
  await page.viewport(375, 812);
}

const baseVm: DisciplineScreenVM = {
  viewerRole: "teacher",
  availableClasses: ["10A1", "11B2", "12C1"],
  initialTab: "violations",
  initialSemester: "HK1 2025–2026",
  violations: MOCK_VIOLATIONS,
  conductSummary: MOCK_CONDUCT,
  leaveRequests: MOCK_LEAVE_REQUESTS,
  recordViolationAction: noop,
  deleteViolationAction: noop,
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
        <Toaster />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof DisciplineScreen>;

/**
 * Skeleton while the RSC streams initial data (AC-1). US-E17.10: the whole
 * loading block (stat grid + table skeleton) is wrapped in ONE role="status" +
 * aria-busy="true" region so screen readers announce loading once, without
 * focus (FR-005 / WCAG 4.1.3, A11Y-001).
 */
export const Loading: Story = {
  args: { ...baseVm, isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Kỷ luật|Hành chính/ }),
    ).toBeInTheDocument();
    // Exactly ONE status region for the whole loading block: the nested stat
    // grid opts out of its own live region (announce={false}) so screen
    // readers announce the single logical loading event once, not twice
    // (US-E17.10, A11Y-001 / WCAG 4.1.3).
    const statuses = canvas.getAllByRole("status");
    await expect(statuses.length).toBe(1);
    await expect(statuses[0]).toHaveAttribute("aria-busy", "true");
  },
};

/** Teacher view of the violations tab — list + record CTA visible. */
export const ViolationsTab_Teacher: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Trần Văn Bình")).toBeInTheDocument();

    // US-E17.11 / AC-E17.11-10 + AC-E17.11-13 — regression guard for the
    // "already compliant, no code change" claim on violations-tab.tsx. At a
    // real 375px viewport the violation <li> row is ≥44px tall (py-3.5 +
    // DisciplineAvatar size="lg"), and the teacher-only icon-only delete button
    // (Button size="icon" → min-h-11 min-w-11 from US-E17.8 A11Y-004) is
    // ≥44×44px. Proven via live layout (getBoundingClientRect), not className.
    await resizeToMobile();
    const deleteBtn = canvas.getByRole("button", {
      name: "Xóa vi phạm của Trần Văn Bình ngày 2026-04-29",
    });
    const btnRect = deleteBtn.getBoundingClientRect();
    await expect(btnRect.height).toBeGreaterThanOrEqual(44);
    await expect(btnRect.width).toBeGreaterThanOrEqual(44);
    const row = deleteBtn.closest("li");
    await expect(row).not.toBeNull();
    await expect(
      (row as HTMLElement).getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(44);

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

/**
 * Delete-violation flow (US-E17.8 FR-007) — teacher clicks the per-row delete
 * button, the confirm dialog opens with the correct discipline i18n keys,
 * confirming calls `deleteViolationAction` and removes the row optimistically
 * with a success toast. Also proves the per-row `aria-label` is
 * student/date-distinguishable (A11Y-005 fix — previously unexercised).
 */
export const ViolationsTab_DeleteFlow: Story = {
  args: {
    ...baseVm,
    deleteViolationAction: async () => ({}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // A11Y-005: each row's delete button has a distinguishable aria-label
    // (studentName + date interpolated), not one generic shared label.
    const deleteBinh = canvas.getByRole("button", {
      name: "Xóa vi phạm của Trần Văn Bình ngày 2026-04-29",
    });
    const deleteDung = canvas.getByRole("button", {
      name: "Xóa vi phạm của Phạm Đức Dũng ngày 2026-04-28",
    });
    await expect(deleteBinh).toBeInTheDocument();
    await expect(deleteDung).toBeInTheDocument();

    await userEvent.click(deleteBinh);

    const dialog = await body.findByRole("alertdialog");
    await expect(within(dialog).getByText("Xóa vi phạm?")).toBeInTheDocument();
    await expect(
      within(dialog).getByText(/Vi phạm của Trần Văn Bình/),
    ).toBeInTheDocument();

    const confirmBtn = within(dialog).getByRole("button", {
      name: "Xóa vi phạm",
    });
    await userEvent.click(confirmBtn);

    // Optimistic removal — the row (and its uniquely-labelled delete button)
    // disappears from the list.
    await waitFor(() =>
      expect(canvas.queryByText("Trần Văn Bình")).not.toBeInTheDocument(),
    );
    await expect(
      await body.findByText("Đã xóa vi phạm của Trần Văn Bình."),
    ).toBeInTheDocument();
  },
};

/**
 * US-E17.12 (DR-011 §UX-06) — recording a violation fires the CONTEXTUAL
 * toast `discipline.violations.successContext` interpolated with the student
 * name (AC-E17.12-06), not the generic `success`.
 *
 * The generic fallback (AC-E17.12-09, `studentName` unavailable) is not
 * reachable through this UI — the form's submit button stays disabled while
 * `studentName` is empty (see `ViolationsTab_Teacher` above) — so that branch
 * is pinned by the `resolveViolationToastParams` unit tests instead
 * (`violation-toast-params.test.ts`).
 */
export const ViolationsTab_RecordViolation_ContextualToast: Story = {
  args: {
    ...baseVm,
    recordViolationAction: async () => ({}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Nhập vi phạm mới" }),
    );
    await userEvent.type(
      canvas.getByLabelText(/Tên học sinh/i),
      "Nguyen Van A",
    );
    await userEvent.type(
      canvas.getByLabelText(/Mô tả vi phạm/i),
      "Đi học muộn 15 phút không lý do.",
    );
    const submitBtn = canvas.getByRole("button", {
      name: /Ghi nhận vi phạm/i,
    });
    await expect(submitBtn).toBeEnabled();
    await userEvent.click(submitBtn);

    const body = within(document.body);
    await expect(
      await body.findByText("Đã ghi nhận vi phạm của Nguyen Van A"),
    ).toBeInTheDocument();
  },
};

/**
 * Delete-violation error path — mutation rejects, parent shows the mapped
 * error toast and keeps the row (no optimistic removal on failure).
 */
export const ViolationsTab_DeleteError: Story = {
  args: {
    ...baseVm,
    deleteViolationAction: async () => ({ errorKey: "network-error" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      canvas.getByRole("button", {
        name: "Xóa vi phạm của Trần Văn Bình ngày 2026-04-29",
      }),
    );
    const dialog = await body.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Xóa vi phạm" }),
    );

    await expect(
      await body.findByText("Lỗi kết nối, vui lòng thử lại"),
    ).toBeInTheDocument();
    // Row stays — no optimistic removal on failure.
    await expect(canvas.getByText("Trần Văn Bình")).toBeInTheDocument();
  },
};

/** Principal view — teacher-only delete button is not rendered (role gate). */
export const ViolationsTab_Principal_NoDeleteButton: Story = {
  args: { ...baseVm, viewerRole: "principal" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", {
        name: "Xóa vi phạm của Trần Văn Bình ngày 2026-04-29",
      }),
    ).not.toBeInTheDocument();
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
