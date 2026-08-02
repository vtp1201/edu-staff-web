import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
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
 * A11Y-001 (WCAG 2.4.3, US-E18.32): a CONTROLLED sheet (no `<SheetTrigger>` —
 * the pattern every detail/drawer sheet in this repo uses) left Radix's
 * triggerRef null, so closing dropped focus to `<body>`. `SheetContent` now
 * captures the invoker at open and restores it on close, for ALL consumers.
 */
function ControlledSheetHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" data-testid="invoker" onClick={() => setOpen(true)}>
        Mở bảng
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const ControlledSheetRestoresFocusOnClose: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <ControlledSheetHarness />
    </NextIntlClientProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const invoker = canvas.getByTestId("invoker");
    invoker.focus();
    await userEvent.click(invoker);
    await body.findByRole("dialog");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(invoker).toHaveFocus());
    await expect(document.activeElement).not.toBe(document.body);
  },
};

/**
 * Regression guard for the trigger-based path: the primitive's own
 * `onCloseAutoFocus` must not steal focus from a real `<SheetTrigger>`.
 */
export const TriggerSheetStillRestoresFocus: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </NextIntlClientProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByTestId("trigger");
    await userEvent.click(trigger);
    await body.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
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
