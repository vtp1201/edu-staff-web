import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
