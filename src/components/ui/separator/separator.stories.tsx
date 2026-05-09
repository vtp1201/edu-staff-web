import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Separator>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
