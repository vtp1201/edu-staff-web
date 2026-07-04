import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { EmptyMessagingState } from "./empty-messaging-state";

const meta: Meta<typeof EmptyMessagingState> = {
  title: "Features/Messaging/EmptyMessagingState",
  component: EmptyMessagingState,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="flex h-[400px]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof EmptyMessagingState>;

/** No onStart → CTA suppressed; canonical empty state (AC-04.x). */
export const Default: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status");
    await expect(status).toBeInTheDocument();
    const svg = status.querySelector("svg");
    await expect(svg).not.toBeNull();
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(
      canvas.getByText("Chọn một cuộc trò chuyện"),
    ).toBeInTheDocument();
    const body = canvas.getByText(/Nhấn vào một cuộc trò chuyện/i);
    await expect(body.className).toContain("text-edu-text-secondary");
    await expect(body.className).not.toContain("text-muted-foreground");
    await expect(status.querySelector("button")).toBeNull();
  },
};

/** onStart provided → CTA fires; 44px touch target (AC-05.x). */
export const WithCTA: Story = {
  args: { onStart: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status");
    await expect(status).toBeInTheDocument();
    const svg = status.querySelector("svg");
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    const body = canvas.getByText(/Nhấn vào một cuộc trò chuyện/i);
    await expect(body.className).toContain("text-edu-text-secondary");
    const btn = canvas.getByRole("button", {
      name: /Bắt đầu cuộc hội thoại/i,
    });
    await expect(btn.clientHeight).toBeGreaterThanOrEqual(44);
    await userEvent.click(btn);
    await expect(args.onStart).toHaveBeenCalledTimes(1);
  },
};
