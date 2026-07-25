import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import en from "@/bootstrap/i18n/messages/en.json";
import vi from "@/bootstrap/i18n/messages/vi.json";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

const meta = {
  title: "UI/Sheet",
  component: Sheet,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

function SheetHarness() {
  return (
    <Sheet defaultOpen>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Title</SheetTitle>
          <SheetDescription>Description</SheetDescription>
        </SheetHeader>
        <p>Content</p>
      </SheetContent>
    </Sheet>
  );
}

export const Default: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <SheetHarness />
    </NextIntlClientProvider>
  ),
};

/**
 * i18n regression guard (a11y finding, US-E09.6 follow-up): the close button's
 * accessible name must come from the message catalogue for the ACTIVE locale
 * (previously hardcoded to the English literal "Close" regardless of locale).
 */
export const CloseButtonLocaleVi: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <SheetHarness />
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
      <SheetHarness />
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    const close = await body.findByRole("button", {
      name: en.Common.close,
    });
    await expect(close).toBeInTheDocument();
  },
};

export const CloseButtonDismissesSheet: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <SheetHarness />
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    const close = await body.findByRole("button", { name: vi.Common.close });
    await userEvent.click(close);
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

/**
 * Explicit `closeLabel` override still wins over the translated default —
 * preserves the (rarely used) escape hatch consumers may already rely on.
 */
export const CloseButtonExplicitLabelOverride: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent closeLabel="Đóng bảng">
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    await expect(
      body.findByRole("button", { name: "Đóng bảng" }),
    ).resolves.toBeInTheDocument();
  },
};
