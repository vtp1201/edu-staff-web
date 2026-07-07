import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { FilterBar } from "./filter-bar";

const meta: Meta<typeof FilterBar> = {
  title: "Features/AuditLog/FilterBar",
  component: FilterBar,
  parameters: { layout: "padded" },
  args: { onFilterChange: () => {}, onReset: () => {} },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof FilterBar>;

export const Empty: Story = {
  args: { filters: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("combobox", { name: /Lọc theo loại đối tượng/i }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByLabelText(/Tìm theo người thực hiện/i),
    ).toBeInTheDocument();
  },
};

export const Populated: Story = {
  args: {
    filters: {
      entityType: "grade",
      action: "UPDATE",
      actorQuery: "Hương",
      from: "2026-06-01",
      to: "2026-06-30",
    },
  },
};
