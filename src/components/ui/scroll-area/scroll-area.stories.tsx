import type { Meta, StoryObj } from "@storybook/react";
import { ScrollArea } from "./scroll-area";

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {},
};
