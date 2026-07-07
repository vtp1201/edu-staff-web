import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ComplianceNotice } from "./compliance-notice";

const meta: Meta<typeof ComplianceNotice> = {
  title: "Features/AuditLog/ComplianceNotice",
  component: ComplianceNotice,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ComplianceNotice>;

/** AC-8 — read-only / append-only compliance banner (Nghị định 13/2023). */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Nghị định 13\/2023\/NĐ-CP/i),
    ).toBeInTheDocument();
  },
};
