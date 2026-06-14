import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
};

export const Labelled: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <GoogleIcon className="size-6" aria-label="Google" />
      <VneidIcon className="size-6" aria-label="VNeID" />
    </div>
  ),
};
