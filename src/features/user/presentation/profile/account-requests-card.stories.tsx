import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import viMessages from "@/bootstrap/i18n/messages/vi.json";
import { AccountRequestsCard } from "./account-requests-card";

const meta: Meta<typeof AccountRequestsCard> = {
  title: "Features/User/Profile/AccountRequestsCard",
  component: AccountRequestsCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <div className="max-w-[260px]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AccountRequestsCard>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The only affordance is a mailto link to the admin (AC-5: no write API).
    const link = canvas.getByRole("link", { name: /quản trị/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", expect.stringContaining("mailto:"));
  },
};
