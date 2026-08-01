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

/**
 * `describedById` lets a host link caller-owned explanatory copy to the button —
 * e.g. an empty list that still has pages left, where "Tải thêm" next to "nothing
 * here" is otherwise unexplained to a screen-reader user (US-E18.29 A11Y-002).
 * Purely additive: omitted → no `aria-describedby` attribute at all.
 */
export const WithDescribedBy: Story = {
  decorators: [
    (StoryFn) => (
      <>
        <p id="lmb-hint">Có thể còn kết quả ở các trang tiếp theo.</p>
        <StoryFn />
      </>
    ),
  ],
  args: { describedById: "lmb-hint" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /Tải thêm/ });
    await expect(btn).toHaveAttribute("aria-describedby", "lmb-hint");
    // The linked copy is what an SR reads after the label.
    await expect(btn).toHaveAccessibleDescription(
      "Có thể còn kết quả ở các trang tiếp theo.",
    );
  },
};

/** No `describedById` → the attribute is absent, not empty. */
export const WithoutDescribedBy: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Tải thêm" }),
    ).not.toHaveAttribute("aria-describedby");
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
