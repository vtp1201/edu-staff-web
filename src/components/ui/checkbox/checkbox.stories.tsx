import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
