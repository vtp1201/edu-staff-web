import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ListError } from "./list-error";

/**
 * Canonical list-level error + retry card (INFRA-shared-list-states). Covers the
 * two shapes found repo-wide: one bold `message` line (SD/SA) and a
 * `title`/`description` pair (parent-links, invitations), with a `plain` or
 * `boxed` icon treatment.
 */
const meta = {
  title: "Shared/ListError",
  component: ListError,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof ListError>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SD/SA shape: single bold message line, bare size-10 icon, outline + rotate. */
export const MessageVariant: Story = {
  args: {
    message: "Không tải được danh sách. Vui lòng thử lại.",
    retryLabel: "Thử lại",
    iconSize: 10,
    retryIcon: "rotate",
    retryButtonVariant: "outline",
    onRetry: fn(),
    className: "gap-3 px-5 py-10",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    await expect(alert).toBeInTheDocument();
    await expect(
      canvas.getByText("Không tải được danh sách. Vui lòng thử lại."),
    ).toBeInTheDocument();
    // Icon is decorative only.
    const icon = alert.querySelector("svg");
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon).toHaveClass("size-10");
    // Retry is a real button, ≥44px tall (accessibility.md touch target).
    const retry = canvas.getByRole("button", { name: /Thử lại/ });
    await expect(retry).toHaveAttribute("type", "button");
    await expect(retry).toHaveClass("min-h-11");
    await userEvent.click(retry);
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

/** Invitations shape: title + description, bare size-12 icon, no button icon. */
export const TitleAndDescription: Story = {
  args: {
    title: "Không tải được lời mời",
    description: "Đã xảy ra lỗi khi tải danh sách lời mời.",
    retryLabel: "Tải lại",
    iconSize: 12,
    retryIcon: "none",
    retryButtonVariant: "secondary",
    onRetry: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    await expect(
      canvas.getByText("Không tải được lời mời"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("Đã xảy ra lỗi khi tải danh sách lời mời."),
    ).toBeInTheDocument();
    await expect(alert.querySelector("svg")).toHaveClass("size-12");
    const retry = canvas.getByRole("button", { name: "Tải lại" });
    // `retryIcon: "none"` → no icon inside the button.
    await expect(retry.querySelector("svg")).toBeNull();
    await userEvent.click(retry);
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

/** parent-links shape: size-6 icon inside a tinted rounded box. */
export const BoxedIcon: Story = {
  args: {
    title: "Không tải được danh sách liên kết",
    description: "Vui lòng thử lại sau ít phút.",
    retryLabel: "Tải lại",
    iconVariant: "boxed",
    iconSize: 6,
    retryIcon: "refresh",
    retryButtonSize: "sm",
    onRetry: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    const box = alert.querySelector(".bg-edu-error-dark-light");
    await expect(box).not.toBeNull();
    await expect(box).toHaveClass("size-13");
    const icon = box?.querySelector("svg");
    await expect(icon).toHaveClass("size-6");
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    // The boxed variant still renders a retry icon when asked to.
    await expect(
      canvas.getByRole("button", { name: /Tải lại/ }).querySelector("svg"),
    ).not.toBeNull();
  },
};

/** `message` wins over `title`/`description` (they are mutually exclusive). */
export const MessageTakesPrecedence: Story = {
  args: {
    message: "Lỗi mạng",
    title: "Không nên hiển thị",
    description: "Cũng không nên hiển thị",
    retryLabel: "Thử lại",
    iconSize: 10,
    onRetry: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Lỗi mạng")).toBeInTheDocument();
    await expect(canvas.queryByText("Không nên hiển thị")).toBeNull();
    await expect(canvas.queryByText("Cũng không nên hiển thị")).toBeNull();
  },
};
