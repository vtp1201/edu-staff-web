import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { EmailVerifyProvider } from "@/features/auth/presentation/email-verify/email-verify-context";
import type {
  LinkedAccount,
  SocialProvider,
} from "@/features/user/domain/entities/linked-account.entity";
import type { LinkedAccountResult } from "@/features/user/domain/repositories/i-linked-accounts.repository";
import { ProfileScreen } from "./profile-screen";

// Navigates to the Security tab where LinkedAccountsSection lives.
async function openSecurityTab(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const securityTab = canvas.getByRole("tab", { name: /bảo mật/i });
  await userEvent.click(securityTab);
}

const BASE = {
  fullName: "Nguyễn Văn A",
  email: "a@school.edu.vn",
  phone: "0901 234 567",
  role: "teacher",
  sessions: [
    {
      id: "1",
      device: "Chrome · macOS",
      lastActive: "vừa xong",
      current: true,
    },
    {
      id: "2",
      device: "Safari · iPhone",
      lastActive: "2 giờ trước",
      current: false,
    },
  ],
};

const LINKED_BOTH: LinkedAccount[] = [
  { provider: "vneId", linked: true, email: "a@school.edu.vn" },
  { provider: "google", linked: true, email: "a.nguyen@gmail.com" },
];

const LINKED_NONE: LinkedAccount[] = [
  { provider: "vneId", linked: false },
  { provider: "google", linked: false },
];

const okLink = (): Promise<LinkedAccountResult> =>
  Promise.resolve({ success: true });
const failLink = (): Promise<LinkedAccountResult> =>
  Promise.resolve({ success: false, failure: { type: "link-failed" } });
const neverResolve = (_p: SocialProvider): Promise<LinkedAccountResult> =>
  new Promise(() => {});

const okAction = () => Promise.resolve({ ok: true as const });

function withProviders(
  Story: () => React.ReactElement,
  context: { parameters: { emailVerified?: boolean | null } },
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Distinguish "not set" (→ false) from an explicit `null` (unresolved).
  const p = context.parameters.emailVerified;
  const emailVerified = p === undefined ? false : p;
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={messages}>
        <EmailVerifyProvider
          initialEmailVerified={emailVerified}
          email={BASE.email}
        >
          <div className="p-6">
            <Story />
          </div>
        </EmailVerifyProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof ProfileScreen> = {
  title: "Profile/ProfileScreen",
  component: ProfileScreen,
  parameters: { layout: "fullscreen" },
  decorators: [withProviders],
  args: {
    ...BASE,
    linkedAccounts: LINKED_BOTH,
    onLinkAccount: okLink,
    onUnlinkAccount: okLink,
    onConfirmEmailVerification: okAction,
    onRequestEmailVerification: okAction,
  },
};
export default meta;
type Story = StoryObj<typeof ProfileScreen>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // AccountRequestsCard lives in the left identity column (mailto-only, AC-5).
    const contactLink = canvas.getByRole("link", { name: /quản trị viên/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
    // Security tab → LinkedAccountsSection. Default args = LINKED_BOTH.
    await openSecurityTab(canvasElement);
    const linkedBadges = canvas.getAllByText(/đã liên kết/i);
    expect(linkedBadges.length).toBeGreaterThanOrEqual(1);
  },
};

export const LinkedAccounts: Story = {
  args: { linkedAccounts: LINKED_BOTH },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openSecurityTab(canvasElement);
    // Both providers linked → exactly two "Đã liên kết" badges.
    const linkedBadges = canvas.getAllByText(/đã liên kết/i);
    expect(linkedBadges).toHaveLength(2);
  },
};

export const LinkedAccountsBothUnlinked: Story = {
  args: { linkedAccounts: LINKED_NONE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openSecurityTab(canvasElement);
    // No providers linked → zero linked badges, two "Liên kết ngay" buttons.
    const linkedBadges = canvas.queryAllByText(/đã liên kết/i);
    expect(linkedBadges).toHaveLength(0);
    const linkButtons = canvas.getAllByRole("button", {
      name: /liên kết ngay/i,
    });
    expect(linkButtons).toHaveLength(2);
  },
};

export const LinkedAccountsLinkingInProgress: Story = {
  args: { linkedAccounts: LINKED_NONE, onLinkAccount: neverResolve },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openSecurityTab(canvasElement);
    // Trigger a link that never resolves → button enters aria-busy state.
    const [firstLink] = canvas.getAllByRole("button", {
      name: /liên kết ngay/i,
    });
    await userEvent.click(firstLink);
    const busyButtons = canvasElement.querySelectorAll('[aria-busy="true"]');
    expect(busyButtons.length).toBeGreaterThanOrEqual(1);
  },
};

export const LinkedAccountsLinkError: Story = {
  args: { linkedAccounts: LINKED_NONE, onLinkAccount: failLink },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openSecurityTab(canvasElement);
    // Trigger a failing link → an error alert is announced.
    const [firstLink] = canvas.getAllByRole("button", {
      name: /liên kết ngay/i,
    });
    await userEvent.click(firstLink);
    const alertEl = await canvas.findByRole("alert");
    expect(alertEl).toBeInTheDocument();
  },
};

// ── Email verification row (US-E22.1) ──────────────────────────────────────
export const EmailUnverified: Story = {
  parameters: { emailVerified: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Warning badge + CTA present on the personal tab (default tab).
    expect(canvas.getByText(/chưa xác thực/i)).toBeInTheDocument();
    const cta = canvas.getByRole("button", { name: /xác thực ngay/i });
    // Opening the CTA mounts the dialog (Radix portal → document.body).
    await userEvent.click(cta);
    const dialog = within(document.body).getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  },
};

export const EmailVerified: Story = {
  parameters: { emailVerified: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText(/đã xác thực/i)).toBeInTheDocument();
    // No CTA when already verified (AC-007.5).
    expect(
      canvas.queryByRole("button", { name: /xác thực ngay/i }),
    ).not.toBeInTheDocument();
  },
};

export const EmailStatusUnresolved: Story = {
  // Fetch unresolved/error → no badge, not a stale one (AC-007.1/7.3).
  parameters: { emailVerified: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByText(/chưa xác thực/i)).not.toBeInTheDocument();
    expect(canvas.queryByText(/đã xác thực/i)).not.toBeInTheDocument();
    expect(
      canvas.queryByRole("button", { name: /xác thực ngay/i }),
    ).not.toBeInTheDocument();
  },
};
