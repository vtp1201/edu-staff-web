import type { Meta, StoryObj } from "@storybook/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

const meta = {
  title: "UI/AlertDialog",
  component: AlertDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger>Open</AlertDialogTrigger>
      <AlertDialogHeader>
        <AlertDialogTitle>Title</AlertDialogTitle>
        <AlertDialogDescription>Description</AlertDialogDescription>
        <AlertDialogAction>Action</AlertDialogAction>
      </AlertDialogHeader>
      <AlertDialogContent>
        <p>Content</p>
      </AlertDialogContent>
      <AlertDialogFooter>
        <p className="text-sm text-muted-foreground">Footer</p>
      </AlertDialogFooter>
    </AlertDialog>
  ),
};
