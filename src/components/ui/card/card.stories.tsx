import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Description</CardDescription>
        <CardAction>Action</CardAction>
      </CardHeader>
      <CardContent>
        <p>Content</p>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">Footer</p>
      </CardFooter>
    </Card>
  ),
};

/**
 * DR-009 US-E16.3: a Card with `onClick` becomes keyboard-operable — it renders
 * as a focusable `role="button"` and fires the handler on Enter and Space.
 */
export const Interactive: Story = {
  args: { onClick: fn() },
  render: (args) => (
    <Card {...args} className="w-64">
      <CardHeader>
        <CardTitle>Clickable card</CardTitle>
        <CardDescription>Activate with mouse or keyboard</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Tab to focus, then press Enter or Space.
        </p>
      </CardContent>
    </Card>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("button", { name: /Clickable card/i });
    await expect(card).toHaveAttribute("tabindex", "0");

    card.focus();
    await expect(card).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.click(card);
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
};

/**
 * A Card with no `onClick` stays a plain container: no `role="button"`, not
 * focusable.
 */
export const NonInteractive: Story = {
  render: () => (
    <Card className="w-64">
      <CardHeader>
        <CardTitle>Static card</CardTitle>
        <CardDescription>Not focusable, no button role</CardDescription>
      </CardHeader>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
