import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "./switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Switch>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
