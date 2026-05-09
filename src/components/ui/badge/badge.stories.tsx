import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Badge>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
