import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ClipboardList, Trophy, Users } from "lucide-react";
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
