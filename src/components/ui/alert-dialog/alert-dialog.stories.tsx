import type { Meta, StoryObj } from "@storybook/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
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
} as Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<any>;

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
