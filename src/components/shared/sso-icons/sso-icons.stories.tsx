import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { GoogleIcon, VneidIcon } from "./sso-icons";

const meta: Meta = {
  title: "Shared/SsoIcons",
};
export default meta;
type Story = StoryObj;

export const Decorative: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <GoogleIcon className="size-6" />
      <VneidIcon className="size-6" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Decorative variant: no aria-label → hidden from a11y tree, no img role.
    const svgs = canvasElement.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).not.toHaveAttribute("role", "img");
    }
  },
};

export const Labelled: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <GoogleIcon className="size-6" aria-label="Google" />
      <VneidIcon className="size-6" aria-label="VNeID" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Labelled variant: role="img" + aria-label so it is announced.
    expect(canvas.getByRole("img", { name: "Google" })).toBeInTheDocument();
    expect(canvas.getByRole("img", { name: "VNeID" })).toBeInTheDocument();
  },
};
