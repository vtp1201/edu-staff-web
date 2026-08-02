import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { StatusBadge } from "@/components/shared/status-badge";
import { ChildIdentityHeader } from "./child-identity-header";

const meta = {
  title: "Shared/ChildIdentityHeader",
  component: ChildIdentityHeader,
  parameters: { layout: "centered" },
  args: { fullName: "Nguyễn Minh Khoa" },
} satisfies Meta<typeof ChildIdentityHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default (md / primary / double initials) — the US-E20.4 overview-card use. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    await expect(canvas.getByText("MK")).toBeInTheDocument();
  },
};

/**
 * Consent-card shape (US-E20.2): tinted container + a trailing StatusBadge.
 * Guards the refactored `child-consent-card.tsx` call site.
 */
export const ConsentCardShape: Story = {
  args: {
    className: "rounded-lg bg-edu-bg px-3 py-2.5 w-80",
    trailing: <StatusBadge tone="success">Đã liên kết</StatusBadge>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("MK")).toBeInTheDocument();
    await expect(canvas.getByText("Đã liên kết")).toBeInTheDocument();
  },
};

/**
 * Parent-dashboard shape: lg avatar, purple tone, single initial, class
 * subtitle. Guards the refactored `parent-dashboard.tsx` call site.
 */
export const DashboardShape: Story = {
  args: {
    fullName: "Nguyễn Minh An",
    tone: "purple",
    size: "lg",
    initials: "single",
    subtitle: "10A1",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("A")).toBeInTheDocument();
    await expect(canvas.getByText("10A1")).toBeInTheDocument();
  },
};

/** A long name truncates instead of pushing the trailing slot out of the row. */
export const LongNameTruncates: Story = {
  args: {
    fullName: "Nguyễn Hoàng Thị Phương Uyên Bảo Ngọc Diễm My",
    className: "w-64",
    trailing: <StatusBadge tone="success">Đã liên kết</StatusBadge>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByText(/Nguyễn Hoàng Thị/);
    await expect(name).toHaveClass("truncate");
  },
};
