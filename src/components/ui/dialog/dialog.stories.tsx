import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import en from "@/bootstrap/i18n/messages/en.json";
import vi from "@/bootstrap/i18n/messages/vi.json";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function DialogHarness() {
  return (
    <Dialog defaultOpen>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogHeader>
        <p>Content</p>
      </DialogContent>
    </Dialog>
  );
}

export const Default: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <DialogHarness />
    </NextIntlClientProvider>
  ),
};

/**
 * i18n regression guard (a11y finding, US-E09.6 follow-up): the close button's
 * accessible name must come from the message catalogue for the ACTIVE locale,
 * not a hardcoded Vietnamese literal — English users must see "Close".
 */
export const CloseButtonLocaleVi: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <DialogHarness />
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    const close = await body.findByRole("button", {
      name: vi.Common.close,
    });
    await expect(close).toBeInTheDocument();
  },
};

export const CloseButtonLocaleEn: Story = {
  render: () => (
    <NextIntlClientProvider locale="en" messages={en}>
      <DialogHarness />
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    const close = await body.findByRole("button", {
      name: en.Common.close,
    });
    await expect(close).toBeInTheDocument();
    // No leftover hardcoded Vietnamese literal in English locale.
    await expect(body.queryByText(vi.Common.close)).toBeNull();
  },
};

export const CloseButtonDismissesDialog: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <DialogHarness />
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    const close = await body.findByRole("button", { name: vi.Common.close });
    await userEvent.click(close);
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};
