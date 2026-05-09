import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";

const meta = {
  title: "UI/Label",
  component: Label,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Label>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
