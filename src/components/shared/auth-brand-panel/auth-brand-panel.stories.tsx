import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AuthBrandPanel } from "./auth-brand-panel";

/**
 * The panel is `hidden` below `lg`, so view these stories at ≥1024px width.
 * `fullscreen` layout lets the 42%-width gradient column show its full height.
 */
const meta = {
  title: "Shared/AuthBrandPanel",
  component: AuthBrandPanel,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="flex h-screen">
        <Story />
      </div>
    ),
  ],
  args: {
    title: "EduPortal",
    tagline: "Hệ thống Quản lý Giáo dục",
  },
} satisfies Meta<typeof AuthBrandPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
