import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { SsePendingPill } from "./sse-pending-pill";

const copy = messages.shell.sseStatus;

const meta = {
  title: "Shared/SsePendingPill",
  component: SsePendingPill,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: { onClick: fn() },
} satisfies Meta<typeof SsePendingPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** visible with a small count → pill shows the count, click navigates (AC-7/AC-8). */
export const Pill_Visible: Story = {
  args: { count: 3, visible: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", {
      name: copy.pendingMessageMany.replace("{count}", "3"),
    });
    await expect(button).toBeInTheDocument();
    await expect(button).toHaveTextContent("3");
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** count > 99 → visible glyph caps at "99+" but the aria-label states the real count (AC-7). */
export const Pill_Overflow: Story = {
  args: { count: 140, visible: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", {
      name: copy.pendingMessageMany.replace("{count}", "140"),
    });
    await expect(button).toHaveTextContent(copy.pendingMessageOverflowLabel);
  },
};

/** visible=false (on /messages or count 0) → nothing renders (AC-9). */
export const Pill_HiddenInMessages: Story = {
  args: { count: 5, visible: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
