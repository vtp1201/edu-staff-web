import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { DateRangeFields } from "./date-range-fields";

const meta: Meta<typeof DateRangeFields> = {
  title: "Features/AuditLog/DateRangeFields",
  component: DateRangeFields,
  args: { onFromChange: () => {}, onToChange: () => {} },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof DateRangeFields>;

export const Empty: Story = {};

export const ValidRange: Story = {
  args: { from: "2026-06-01", to: "2026-06-30" },
};

/** AC-12 — from > to surfaces a real derived error (aria-invalid + message). */
export const InvalidRange: Story = {
  args: { from: "2026-06-30", to: "2026-06-01" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Ngày bắt đầu phải trước hoặc bằng ngày kết thúc/i),
    ).toBeInTheDocument();
    const toInput = canvas.getByLabelText(/Đến ngày/i);
    await expect(toInput).toHaveAttribute("aria-invalid", "true");
  },
};
