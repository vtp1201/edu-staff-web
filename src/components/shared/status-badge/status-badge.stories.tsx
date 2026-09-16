import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { withDarkTheme } from "@/test/storybook-dark-decorator";
import { StatusBadge } from "./status-badge";

const meta = {
  title: "Shared/StatusBadge",
  component: StatusBadge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { tone: "primary", children: "Giáo viên" },
};
export const Success: Story = {
  args: { tone: "success", children: "Đang diễn ra" },
};
export const Warning: Story = {
  args: { tone: "warning", children: "Sắp tới" },
};
export const ErrorTone: Story = {
  args: { tone: "error", children: "Vắng mặt" },
};
export const ErrorDark: Story = {
  args: { tone: "error-dark", children: "Đã thu hồi" },
};
export const Info: Story = { args: { tone: "info", children: "Thông tin" } };
export const Purple: Story = {
  args: { tone: "purple", children: "Phụ huynh" },
};
export const Teal: Story = { args: { tone: "teal", children: "Hoạt động" } };
export const Muted: Story = { args: { tone: "muted", children: "Đã xong" } };

/**
 * US-E24.12 dark-token pass: every tone on a real dark card. The chip tints
 * (`--edu-*-light`) and their text tones now have dark-mode values — before,
 * the light tints leaked through and the chips rendered near-white.
 */
export const DarkAllTones: Story = {
  args: { tone: "primary", children: "Giáo viên" },
  globals: { theme: "dark" },
  decorators: [withDarkTheme],
  render: () => (
    <div className="flex flex-wrap gap-2 rounded-[var(--edu-radius-card)] bg-card p-4">
      <StatusBadge tone="primary">Giáo viên</StatusBadge>
      <StatusBadge tone="success">Đang diễn ra</StatusBadge>
      <StatusBadge tone="warning">Sắp tới</StatusBadge>
      <StatusBadge tone="error">Vắng mặt</StatusBadge>
      <StatusBadge tone="error-dark">Đã thu hồi</StatusBadge>
      <StatusBadge tone="info">Thông tin</StatusBadge>
      <StatusBadge tone="purple">Phụ huynh</StatusBadge>
      <StatusBadge tone="teal">Hoạt động</StatusBadge>
      <StatusBadge tone="muted">Đã xong</StatusBadge>
    </div>
  ),
  /**
   * ADR 0077 (US-E24.18): the `error-dark` chip was the last tint without a
   * dark-mode value — it rendered light-pink (#FEE2E2) on a dark card. It now
   * resolves to the dark maroon #7A0011 with #FFDAD6 text (8.85:1, WCAG AA).
   */
  play: async ({ canvasElement }) => {
    const chip = await within(canvasElement).findByText("Đã thu hồi");
    const style = getComputedStyle(chip);
    // #7a0011 — the .dark value of --edu-error-dark-light.
    await expect(style.backgroundColor).toBe("rgb(122, 0, 17)");
    // #ffdad6 — the .dark value of --edu-error-text (dark:text-edu-error-text).
    await expect(style.color).toBe("rgb(255, 218, 214)");
  },
};
