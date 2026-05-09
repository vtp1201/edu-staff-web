import type { Meta, StoryObj } from "@storybook/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "./sonner";

const meta: Meta<typeof Toaster> = {
  title: "UI/Sonner",
  component: Toaster,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.success("Hello from Sonner")}>
        Show toast
      </Button>
      <Toaster />
    </>
  ),
};
