import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { StatCardSkeleton, StatCardSkeletonGrid } from "./stat-card-skeleton";

/**
 * Loading placeholder for the dashboard stat grids (US-E17.10). The pulse
 * animation is gated behind `motion-safe:` inside the base `Skeleton` primitive
 * — with `prefers-reduced-motion: reduce` the blocks render as static
 * `bg-accent` shapes (WCAG 2.3.3 / NFR-004).
 */
const meta: Meta<typeof StatCardSkeletonGrid> = {
  title: "Shared/StatCardSkeleton",
  component: StatCardSkeletonGrid,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof StatCardSkeletonGrid>;

/** A single card placeholder in isolation. */
export const SingleCard: StoryObj<typeof StatCardSkeleton> = {
  render: () => (
    <div className="max-w-xs">
      <StatCardSkeleton />
    </div>
  ),
};

/** The grid as shown on the discipline dashboard (4 cards). */
export const Loading: Story = {
  args: { count: 4, srLabel: "Đang tải dữ liệu" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status");
    await expect(status).toBeInTheDocument();
    await expect(status).toHaveAttribute("aria-busy", "true");
    // sr-only label is present but visually hidden.
    await expect(canvas.getByText("Đang tải dữ liệu")).toBeInTheDocument();
  },
};

/** Teacher dashboard footprint (6 cards). */
export const LoadingSixCards: Story = {
  args: { count: 6, srLabel: "Đang tải dữ liệu" },
};
