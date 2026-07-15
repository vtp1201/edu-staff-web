import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { LoadMoreButton } from "./load-more-button";

const meta: Meta<typeof LoadMoreButton> = {
  title: "Shared/LoadMoreButton",
  component: LoadMoreButton,
  args: {
    hasMore: true,
    isLoadingMore: false,
    label: "Tải thêm",
    errorLabel: "Thử lại",
    onLoadMore: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof LoadMoreButton>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: "Tải thêm" });
    await userEvent.click(btn);
    await expect(args.onLoadMore).toHaveBeenCalledTimes(1);
  },
};

export const Loading: Story = {
  args: { isLoadingMore: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button");
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveAttribute("aria-busy", "true");
  },
};

export const HasError: Story = {
  args: { hasError: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};

/** Removed from the DOM (not merely disabled) when !hasMore. */
export const Exhausted: Story = {
  args: { hasMore: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};
