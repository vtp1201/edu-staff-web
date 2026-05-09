import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./progress";

const meta = {
  title: "UI/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Progress>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
