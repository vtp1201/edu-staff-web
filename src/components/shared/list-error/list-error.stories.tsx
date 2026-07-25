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
    shape: "inline-card",
    iconSize: 10,
    retryIcon: "rotate",
    retryButtonVariant: "outline",
    onRetry: fn(),
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
    shape: "bordered-card",
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
    shape: "bordered-card",
    iconVariant: "boxed",
    iconSize: 6,
    retryIcon: "refresh",
    retryButtonSize: "sm",
    onRetry: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    const box = alert.querySelector(".bg-edu-error-light");
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

/**
 * Dark-mode contrast proof for the boxed icon (fe-accessibility-auditor
 * finding, INFRA-shared-list-states — `edu-error-dark`/`edu-error-dark-light`
 * have no `.dark {}` override in tokens.css, so a boxed icon using that pair
 * silently keeps its light-mode colors in dark mode). `edu-error-light`/
 * `edu-error-text` DO have a `.dark {}` override (US-E21.2) — asserts the
 * actually-rendered computed colors are the dark-mode-safe pair, not the raw
 * light-mode values, giving real (not just class-name) proof of the fix.
 */
export const BoxedIconDarkMode: Story = {
  ...BoxedIcon,
  // Scope `.dark` locally to this story's tree — CSS custom properties cascade
  // from any ancestor with the class, not just `<html>`, so this proves the
  // same token resolution the app's real dark-mode toggle (`.dark` on
  // `<html>`, `next-themes`) produces, without depending on the Storybook
  // theme-toolbar decorator's cross-realm `<html>` targeting inside the
  // component-test runner.
  decorators: [
    (StoryFn) => (
      <div className="dark bg-background p-4">
        <StoryFn />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    const box = alert.querySelector(".bg-edu-error-light");
    await expect(box).not.toBeNull();
    const icon = box?.querySelector("svg");
    await expect(icon).not.toBeNull();

    // Dark-mode override values from `.dark {}` in globals.css.
    const boxBg = window.getComputedStyle(box as Element).backgroundColor;
    const iconColor = window.getComputedStyle(icon as Element).color;
    await expect(boxBg).toBe("rgb(92, 0, 7)"); // --edu-error-light dark override #5c0007
    await expect(iconColor).toBe("rgb(255, 218, 214)"); // --edu-error-text dark override #ffdad6

    // Never the un-overridden `edu-error-dark`/`edu-error-dark-light` raw
    // light-mode values (#fee2e2 / #b91c1c) — that was the bug.
    await expect(boxBg).not.toBe("rgb(254, 226, 226)");
    await expect(iconColor).not.toBe("rgb(185, 28, 28)");
  },
};

/**
 * The `shape` preset supplies the outer card + retry spacing, so no caller
 * repeats a class literal. `inline-card` = SD/SA; `bordered-card` = parent-links
 * / invitations / parent-consent (retry gets `mt-4`).
 */
export const ShapePresetSuppliesOuterClasses: Story = {
  args: {
    message: "Lỗi mạng",
    retryLabel: "Thử lại",
    shape: "inline-card",
    iconSize: 10,
    onRetry: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveClass("shadow-card", "gap-3", "py-10");
    // inline-card keeps the retry in the flow gap — no mt-4.
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).not.toHaveClass("mt-4");
  },
};

/** The `bordered-card` preset moves the retry down by `mt-4`. */
export const BorderedShapeSpacesTheRetry: Story = {
  args: {
    title: "Không tải được",
    retryLabel: "Tải lại",
    shape: "bordered-card",
    iconSize: 12,
    onRetry: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveClass("rounded-xl", "py-12");
    const retry = canvas.getByRole("button", { name: "Tải lại" });
    await expect(retry).toHaveClass("mt-4", "min-h-11");
  },
};
