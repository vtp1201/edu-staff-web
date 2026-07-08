import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { SseDisconnectBanner } from "./sse-disconnect-banner";

const copy = messages.shell.sseStatus;

const meta = {
  title: "Shared/SseDisconnectBanner",
  component: SseDisconnectBanner,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: { onReconnect: fn() },
} satisfies Meta<typeof SseDisconnectBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * status undefined → the live region stays mounted (A11Y-006) but hidden with
 * no visible content or reconnect button (AC-1).
 */
export const Banner_Hidden: Story = {
  args: { status: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A11Y-006: node present from first paint so SRs register the live region.
    const region = canvas.getByRole("status", { hidden: true });
    await expect(region).toHaveClass("hidden");
    await expect(
      canvas.queryByRole("button", { name: copy.reconnectButton }),
    ).toBeNull();
  },
};

/** disconnected → warning banner + enabled reconnect button (AC-2/AC-5). */
export const Banner_Disconnected: Story = {
  args: { status: "disconnected" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole("status");
    await expect(region).toHaveAttribute("aria-live", "polite");
    await expect(canvas.getByText(copy.disconnectedTitle)).toBeInTheDocument();
    await expect(canvas.getByText(copy.disconnectedBody)).toBeInTheDocument();

    const button = canvas.getByRole("button", { name: copy.reconnectButton });
    await expect(button).toBeEnabled();
    await userEvent.click(button);
    await expect(args.onReconnect).toHaveBeenCalledTimes(1);
  },
};

/** connecting → reconnecting title + spinner, no reconnect button (AC-3). */
export const Banner_Reconnecting: Story = {
  args: { status: "connecting" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toBeInTheDocument();
    await expect(canvas.getByText(copy.reconnectingTitle)).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: copy.reconnectButton }),
    ).toBeNull();
    await expect(args.onReconnect).not.toHaveBeenCalled();
  },
};
