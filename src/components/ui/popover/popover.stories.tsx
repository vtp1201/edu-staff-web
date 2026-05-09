import type { Meta, StoryObj } from "@storybook/react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

const meta = {
  title: "UI/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Popover>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverHeader>
        <PopoverTitle>Title</PopoverTitle>
        <PopoverDescription>Description</PopoverDescription>
      </PopoverHeader>
      <PopoverContent>
        <p>Content</p>
      </PopoverContent>
    </Popover>
  ),
};
