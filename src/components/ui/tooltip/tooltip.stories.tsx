import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Tooltip>;

export default meta;
// biome-ignore lint/suspicious/noExplicitAny: storybook render-only story
type Story = StoryObj<any>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent side="right">Tổng quan</TooltipContent>
    </Tooltip>
  ),
};
