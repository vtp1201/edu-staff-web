import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ClipboardList, Trophy, Users } from "lucide-react";
import { expect } from "storybook/test";
import { withDarkTheme } from "@/test/storybook-dark-decorator";
import { StatCard } from "./stat-card";

const meta = {
  title: "Shared/StatCard",
  component: StatCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { label: "Học sinh", value: "214", icon: Users, tone: "info" },
};

export const WithTrendUp: Story = {
  args: {
    label: "Điểm TB",
    value: "8.4",
    icon: Trophy,
    tone: "success",
    trend: { dir: "up", value: "+0.3" },
  },
};

export const WithTrendDown: Story = {
  args: {
    label: "Tỉ lệ điểm danh",
    value: "96.4%",
    icon: ClipboardList,
    tone: "warning",
    trend: { dir: "down", value: "-0.5%" },
  },
};

export const Compact: Story = {
  args: { label: "Có mặt", value: "28", variant: "compact", tone: "success" },
};

export const CompactMuted: Story = {
  args: { label: "Tổng", value: "30", variant: "compact", tone: "muted" },
};

export const Mini: Story = {
  args: {
    label: "Điểm TB",
    value: "8.6",
    variant: "mini",
    icon: <Trophy className="size-4 text-edu-success" />,
  },
};

/** US-E24.12 dark-token pass: card surface, value and trend on a dark page. */
export const Dark: Story = {
  args: {
    label: "Điểm TB",
    value: "8.4",
    icon: Trophy,
    tone: "success",
    trend: { dir: "up", value: "+0.3" },
  },
  globals: { theme: "dark" },
  decorators: [withDarkTheme],
};

/**
 * The tone that was actually broken in dark mode: `warning`'s icon used the
 * FIXED `--edu-warning-foreground` (#2a3547, no dark value) on a
 * `bg-edu-warning/15` box over a dark card → ~1.10:1 (WCAG 1.4.11 needs 3:1).
 * It now uses the theme-aware `--edu-text-primary`, which flips to #eaeff5 in
 * dark — proven here by the COMPUTED icon colour, not by eye.
 */
export const DarkWarning: Story = {
  args: {
    label: "Tỉ lệ điểm danh",
    value: "96.4%",
    icon: ClipboardList,
    tone: "warning",
    trend: { dir: "down", value: "-0.5%" },
  },
  globals: { theme: "dark" },
  decorators: [withDarkTheme],
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector("span > svg");
    await expect(icon).not.toBeNull();
    // #eaeff5 — the dark value of --edu-text-primary.
    await expect(getComputedStyle(icon as Element).color).toBe(
      "rgb(234, 239, 245)",
    );
  },
};
