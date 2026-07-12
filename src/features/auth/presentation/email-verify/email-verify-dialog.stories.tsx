import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { EmailVerificationActionResult } from "@/app/[locale]/t/[tenant]/(app)/email-verification.actions";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { EmailVerifyProvider } from "./email-verify-context";
import { EmailVerifyDialog } from "./email-verify-dialog";

const EMAIL = "nguyen.huong@email.com";

type Args = {
  onConfirm?: (otp: string) => Promise<EmailVerificationActionResult>;
  onResend?: () => Promise<EmailVerificationActionResult>;
};

function Harness({ onConfirm, onResend }: Args) {
  const [open, setOpen] = useState(true);
  return (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <EmailVerifyProvider initialEmailVerified={false} email={EMAIL}>
        <EmailVerifyDialog
          open={open}
          onOpenChange={setOpen}
          onConfirm={onConfirm}
          onResend={onResend}
        />
      </EmailVerifyProvider>
    </NextIntlClientProvider>
  );
}

const meta = {
  title: "Auth/EmailVerifyDialog",
  render: (args: Args) => <Harness {...args} />,
  parameters: { layout: "fullscreen" },
  args: {
    onConfirm: (): Promise<EmailVerificationActionResult> =>
      Promise.resolve({ ok: true }),
    onResend: (): Promise<EmailVerificationActionResult> =>
      Promise.resolve({ ok: true }),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

async function typeCode(code: string) {
  const dialog = within(document.body).getByRole("dialog");
  const cells = within(dialog).getAllByRole("textbox");
  await userEvent.click(cells[0]);
  await userEvent.keyboard(code);
}

async function confirm() {
  const dialog = within(document.body).getByRole("dialog");
  await userEvent.click(
    within(dialog).getByRole("button", { name: /^xác nhận$/i }),
  );
}

export const Idle: Story = {
  play: async () => {
    const dialog = within(document.body).getByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    // Confirm is disabled until 6 digits are entered.
    await expect(
      within(dialog).getByRole("button", { name: /^xác nhận$/i }),
    ).toBeDisabled();
    expect(within(dialog).getAllByRole("textbox")).toHaveLength(6);
  },
};

export const WrongCode: Story = {
  args: { onConfirm: () => Promise.resolve({ errorKey: "invalid-otp" }) },
  play: async () => {
    await typeCode("111111");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /mã không đúng/i,
      ),
    );
    // Cells stay editable (not disabled) after a wrong code.
    await expect(within(dialog).getAllByRole("textbox")[0]).toBeEnabled();
  },
};

export const ExpiredCode: Story = {
  args: { onConfirm: () => Promise.resolve({ errorKey: "otp-expired" }) },
  play: async () => {
    await typeCode("000000");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /mã đã hết hạn/i,
      ),
    );
  },
};

export const Lockout: Story = {
  args: {
    onConfirm: () => Promise.resolve({ errorKey: "too-many-requests" }),
  },
  play: async () => {
    await typeCode("222222");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /quá số lần cho phép/i,
      ),
    );
    // Cells are disabled until a new code is requested (AC-006.2).
    await expect(within(dialog).getAllByRole("textbox")[0]).toBeDisabled();
  },
};

export const Success: Story = {
  args: { onConfirm: () => Promise.resolve({ ok: true }) },
  play: async () => {
    await typeCode("123456");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByText(/email đã được xác thực/i)).toBeVisible(),
    );
  },
};
