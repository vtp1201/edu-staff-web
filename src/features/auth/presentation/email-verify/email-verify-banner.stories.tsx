import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { EmailVerificationActionResult } from "@/app/[locale]/t/[tenant]/(app)/email-verification.actions";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { EmailVerifyBanner } from "./email-verify-banner";
import { EmailVerifyProvider } from "./email-verify-context";
import { EmailVerifyDialog } from "./email-verify-dialog";

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

// ── Gap coverage (fe-qa-playwright, US-E22.1 QA pass) ──────────────────────

/** Mounts the banner AND the dialog under the SAME EmailVerifyProvider — the
 * only way to prove AC-008.4 (shared clock across surfaces) in Storybook,
 * since the banner/dialog live in separate subtrees when used from AppShell/
 * Profile in the real app but always share one context instance. The dialog
 * starts CLOSED — while a modal is open, Radix correctly marks the rest of
 * the page inert (aria-hidden + pointer-events:none), so the banner CTA
 * behind it is genuinely unclickable, same as in the real app. */
function SharedCooldownHarness() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <EmailVerifyProvider initialEmailVerified={false} email={EMAIL}>
        <EmailVerifyBanner
          onSend={(): Promise<EmailVerificationActionResult> =>
            Promise.resolve({ ok: true })
          }
        />
        <button type="button" onClick={() => setDialogOpen(true)}>
          Mở hộp thoại xác thực
        </button>
        <EmailVerifyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onResend={(): Promise<EmailVerificationActionResult> =>
            Promise.resolve({ ok: true })
          }
        />
      </EmailVerifyProvider>
    </NextIntlClientProvider>
  );
}

export const SharedCooldownAcrossSurfaces: Story = {
  render: () => <SharedCooldownHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1) Start the cooldown from the BANNER's send CTA (dialog not open yet).
    await userEvent.click(
      canvas.getByRole("button", { name: /gửi mail xác thực/i }),
    );
    await expect(
      await canvas.findByText(/gửi lại được sau/i),
    ).toBeInTheDocument();

    // 2) Open the dialog (separate subtree, same EmailVerifyProvider) AFTER
    // the cooldown is already running — it must reflect the SAME remaining
    // time, not a fresh actionable "Gửi lại mã" button (AC-008.4).
    await userEvent.click(
      canvas.getByRole("button", { name: /mở hộp thoại xác thực/i }),
    );
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(dialog).toHaveTextContent(/gửi lại mã được sau/i),
    );
    expect(
      within(dialog).queryByRole("button", { name: /gửi lại mã/i }),
    ).not.toBeInTheDocument();
  },
};
