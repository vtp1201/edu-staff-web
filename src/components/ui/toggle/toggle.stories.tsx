import type { Meta, StoryObj } from "@storybook/react";
import { Toggle } from "./toggle";

const meta = {
  title: "UI/Toggle",
  component: Toggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
