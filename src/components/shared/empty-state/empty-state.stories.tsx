import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarOff, Inbox, Plus } from "lucide-react";
import { expect, within } from "storybook/test";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Shared/EmptyState",
  component: EmptyState,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Canonical no-CTA variant (the shape US-E17.4 discipline empty states use). */
export const Default: Story = {
  args: { icon: CalendarOff, title: "Chưa có yêu cầu nghỉ phép" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByRole("status");
    await expect(container).toBeInTheDocument();
    // icon is aria-hidden and not exposed to the a11y tree
    const svg = container.querySelector("svg");
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    // title is a <p>, not a heading; no CTA in the no-CTA variant
    await expect(canvas.getByText("Chưa có yêu cầu nghỉ phép").tagName).toBe(
      "P",
    );
    await expect(container.querySelector("h2")).toBeNull();
    await expect(container.querySelector("h3")).toBeNull();
    await expect(container.querySelector("button")).toBeNull();
  },
};

export const WithBody: Story = {
  args: {
    icon: Inbox,
    title: "Hộp thư trống",
    body: "Khi có tin nhắn mới, chúng sẽ hiển thị ở đây.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toBeInTheDocument();
    await expect(
      canvas.getByText("Khi có tin nhắn mới, chúng sẽ hiển thị ở đây."),
    ).toBeInTheDocument();
  },
};

export const WithCta: Story = {
  args: {
    icon: Inbox,
    title: "Chưa có mục nào",
    cta: { label: "Thêm mới", icon: Plus, onClick: () => {} },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /Thêm mới/ }),
    ).toBeInTheDocument();
  },
};
