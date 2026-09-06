import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ProgressBar } from "./progress-bar";

const meta = {
  title: "Shared/ProgressBar",
  component: ProgressBar,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The common case: a percent passed straight through (`max` defaults to 100). */
export const Default: Story = {
  args: { value: 45, color: "warning", label: "Tháng 2 · tỉ lệ chuyên cần" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", {
      name: "Tháng 2 · tỉ lệ chuyên cần",
    });
    await expect(bar).toHaveAttribute("aria-valuenow", "45");
    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "100");
  },
};

/** value/max, not a pre-computed percent. */
export const FromRatio: Story = {
  args: { value: 19, max: 20, color: "success", label: "Tháng 3" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("progressbar", { name: "Tháng 3" }),
    ).toHaveAttribute("aria-valuenow", "95");
  },
};

export const Full: Story = {
  args: { value: 100, color: "success", label: "Tháng 1" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("progressbar", { name: "Tháng 1" }),
    ).toHaveAttribute("aria-valuenow", "100");
  },
};

/** A month with no recorded days: `0/0` must read 0%, never `NaN`. */
export const EmptyDenominator: Story = {
  args: { value: 0, max: 0, color: "error", label: "Tháng 4" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", { name: "Tháng 4" });
    await expect(bar).toHaveAttribute("aria-valuenow", "0");
    await expect(bar).toHaveAttribute("aria-valuetext", "0%");
    // The percent is also available as text for AT that ignores aria-valuenow.
    await expect(canvas.getByText("0%")).toBeInTheDocument();
  },
};
