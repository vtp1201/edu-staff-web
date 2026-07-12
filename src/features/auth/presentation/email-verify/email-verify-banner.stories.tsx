import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import type { EmailVerificationActionResult } from "@/app/[locale]/t/[tenant]/(app)/email-verification.actions";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { EmailVerifyBanner } from "./email-verify-banner";
import { EmailVerifyProvider } from "./email-verify-context";

const EMAIL = "nguyen.huong@email.com";

const meta = {
  title: "Auth/EmailVerifyBanner",
  component: EmailVerifyBanner,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => {
      // Isolate session-dismiss state between stories.
      if (typeof sessionStorage !== "undefined") sessionStorage.clear();
      return (
        <NextIntlClientProvider locale="vi" messages={messages}>
          <EmailVerifyProvider initialEmailVerified={false} email={EMAIL}>
            <Story />
          </EmailVerifyProvider>
        </NextIntlClientProvider>
      );
    },
  ],
  args: {
    onSend: (): Promise<EmailVerificationActionResult> =>
      Promise.resolve({ ok: true }),
  },
} satisfies Meta<typeof EmailVerifyBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unverified: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toBeInTheDocument();
    await expect(canvas.getByText(/chưa được xác thực/i)).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /gửi mail xác thực/i }),
    ).toBeEnabled();
  },
};

export const SendSuccessCooldown: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /gửi mail xác thực/i }),
    );
    // Sent copy + live cooldown countdown appear.
    await expect(await canvas.findByText(/đã gửi/i)).toBeInTheDocument();
    await expect(canvas.getByText(/gửi lại được sau/i)).toBeInTheDocument();
  },
};

export const SendError: Story = {
  args: {
    onSend: (): Promise<EmailVerificationActionResult> =>
      Promise.resolve({ errorKey: "network-error" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /gửi mail xác thực/i }),
    );
    // Error shown; no cooldown started (send button still available).
    await expect(
      await canvas.findByText(/không thể kết nối/i),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /gửi mail xác thực/i }),
    ).toBeInTheDocument();
  },
};

export const Dismissed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /đóng thông báo xác thực email/i }),
    );
    await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
  },
};
