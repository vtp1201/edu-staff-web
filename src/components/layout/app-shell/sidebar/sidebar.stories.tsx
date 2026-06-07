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

export const Teacher: Story = { args: { role: "teacher" } };
export const Principal: Story = { args: { role: "principal" } };
export const Student: Story = { args: { role: "student" } };
export const Parent: Story = { args: { role: "parent" } };

/** Collapsed rail (72px): icon-only, labels move into hover/focus tooltips. */
export const Collapsed: Story = {
  args: { role: "teacher", collapsed: true, onToggle: () => {} },
};

/** Expanded with the collapse toggle rendered (footer control). */
export const WithToggle: Story = {
  args: { role: "teacher", collapsed: false, onToggle: () => {} },
};
