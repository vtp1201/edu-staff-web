import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  LinkedAccount,
  SocialProvider,
} from "@/features/user/domain/entities/linked-account.entity";
import type { LinkedAccountResult } from "@/features/user/domain/repositories/i-linked-accounts.repository";
import { AccountRequestsCard } from "./account-requests-card";
import { ProfileScreen } from "./profile-screen";

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

function withProviders(Story: () => React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="p-6">
          <Story />
        </div>
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
  },
};
export default meta;
type Story = StoryObj<typeof ProfileScreen>;

export const Default: Story = {};

export const LinkedAccounts: Story = {
  args: { linkedAccounts: LINKED_BOTH },
};

export const LinkedAccountsBothUnlinked: Story = {
  args: { linkedAccounts: LINKED_NONE },
};

export const LinkedAccountsLinkingInProgress: Story = {
  args: { linkedAccounts: LINKED_NONE, onLinkAccount: neverResolve },
};

export const LinkedAccountsLinkError: Story = {
  args: { linkedAccounts: LINKED_NONE, onLinkAccount: failLink },
};

export const AccountRequests: StoryObj<typeof AccountRequestsCard> = {
  render: () => (
    <div className="max-w-[260px]">
      <AccountRequestsCard />
    </div>
  ),
};
