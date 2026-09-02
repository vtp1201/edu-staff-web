import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ItemStatePill } from "./item-state-pill";

const meta: Meta<typeof ItemStatePill> = {
  title: "Features/LMS/ItemStatePill",
  component: ItemStatePill,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages} timeZone="UTC">
        <div className="bg-card p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ItemStatePill>;

export const Open: Story = {
  args: { state: "OPEN" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Đang mở"),
    ).toBeInTheDocument();
  },
};

export const Closed: Story = {
  args: { state: "CLOSED" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Đã đóng — chỉ xem"),
    ).toBeInTheDocument();
  },
};

/** D7: reachable for a student only on an EXAM tile — the lock is decoration
 *  ON TOP of the always-present word, never instead of it. */
export const UpcomingExamLocked: Story = {
  args: { state: "UPCOMING_HIDDEN", examLocked: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Sắp mở")).toBeInTheDocument();
    // The lock glyph is hidden from AT (the text already says it).
    expect(canvasElement.querySelectorAll("svg[aria-hidden]").length).toBe(1);
  },
};
