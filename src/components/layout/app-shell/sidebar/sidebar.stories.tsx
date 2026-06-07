import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Sidebar } from "./sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "Layout/Sidebar",
  component: Sidebar,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div style={{ height: "100vh" }}>
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

const tenantId = "tenant-acme";

export const Teacher: Story = { args: { tenantId, role: "teacher" } };
export const Principal: Story = { args: { tenantId, role: "principal" } };
export const Student: Story = { args: { tenantId, role: "student" } };
export const Parent: Story = { args: { tenantId, role: "parent" } };

/** Collapsed rail (72px): icon-only, labels move into hover/focus tooltips. */
export const Collapsed: Story = {
  args: { tenantId, role: "teacher", collapsed: true, onToggle: () => {} },
};

/** Expanded with the collapse toggle rendered (footer control). */
export const WithToggle: Story = {
  args: { tenantId, role: "teacher", collapsed: false, onToggle: () => {} },
};
