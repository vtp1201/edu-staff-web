import type { Meta, StoryObj } from "@storybook/react";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage />
      <AvatarFallback />
      <AvatarBadge />
    </Avatar>
  ),
};
