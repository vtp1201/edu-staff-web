import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
export const Info: Story = { args: { tone: "info", children: "Thông tin" } };
export const Purple: Story = {
  args: { tone: "purple", children: "Phụ huynh" },
};
export const Teal: Story = { args: { tone: "teal", children: "Hoạt động" } };
export const Muted: Story = { args: { tone: "muted", children: "Đã xong" } };
