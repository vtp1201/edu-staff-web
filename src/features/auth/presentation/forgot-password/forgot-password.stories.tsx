import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ForgotPassword } from "./forgot-password";

const meta: Meta<typeof ForgotPassword> = {
  title: "Auth/ForgotPassword",
  component: ForgotPassword,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ForgotPassword>;

export const Default: Story = {
  args: {
    onRequest: () => Promise.resolve({}),
    onReset: () => Promise.resolve({}),
    loginHref: "/vi/login",
  },
};

/** OTP step reached after a successful request (BE error simulated). */
export const InvalidOtp: Story = {
  args: {
    onRequest: () => Promise.resolve({}),
    onReset: () => Promise.resolve({ errorKey: "invalid-otp" }),
    loginHref: "/vi/login",
  },
};
