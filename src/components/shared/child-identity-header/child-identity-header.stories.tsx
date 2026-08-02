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

/**
 * Bare defaults (md / primary / double initials) — the prop defaults, not a
 * real call site. Every real caller is covered by a `*Shape` story below.
 * `md` initials render at `text-xs`.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    await expect(canvas.getByText("MK")).toHaveClass("text-xs");
  },
};

/**
 * Consent-card shape (US-E20.2): md avatar, primary tone, double initials,
 * tinted container + a trailing StatusBadge. Guards the refactored
 * `features/user/presentation/profile/consent-section/child-consent-card.tsx`
 * call site — `md` keeps the original `text-xs` initials.
 */
export const ConsentCardShape: Story = {
  args: {
    className: "rounded-lg bg-edu-bg px-3 py-2.5 w-80",
    trailing: <StatusBadge tone="success">Đã liên kết</StatusBadge>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("MK")).toHaveClass("text-xs");
    await expect(canvas.getByText("Đã liên kết")).toBeInTheDocument();
  },
};

/**
 * Parent-dashboard shape: lg avatar, purple tone, single initial, class
 * subtitle. Guards the refactored `features/parent/presentation/
 * parent-dashboard.tsx` call site — whose ORIGINAL avatar passed no font-size
 * class, so shadcn's `AvatarFallback` default (`text-sm`, 14px) applied. The
 * assertion below locks that parity: a constant `text-xs` in the shared
 * component would shrink this screen's initials.
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
    const fallback = canvas.getByText("A");
    await expect(fallback).toHaveClass("text-sm");
    await expect(fallback).not.toHaveClass("text-xs");
    await expect(canvas.getByText("10A1")).toBeInTheDocument();
  },
};

/**
 * Overview-card shape (US-E20.4): lg avatar, purple tone, single initial, no
 * subtitle — what `features/parent/presentation/children-overview-screen/
 * child-overview-card.tsx` actually passes (the third use that triggered the
 * promotion). Same `text-sm` initials as the dashboard.
 */
export const OverviewCardShape: Story = {
  args: {
    fullName: "Nguyễn Minh Khoa",
    tone: "purple",
    size: "lg",
    initials: "single",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fallback = canvas.getByText("K");
    await expect(fallback).toHaveClass("text-sm");
    await expect(fallback).toHaveClass("text-edu-purple-text");
    // No consent state / subtitle on the overview card (US-E20.4 AC-004).
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
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
