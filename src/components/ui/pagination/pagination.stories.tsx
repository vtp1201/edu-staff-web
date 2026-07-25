import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import en from "@/bootstrap/i18n/messages/en.json";
import vi from "@/bootstrap/i18n/messages/vi.json";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

const meta = {
  title: "UI/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

function PaginationHarness() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export const Default: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <PaginationHarness />
    </NextIntlClientProvider>
  ),
};

/**
 * i18n regression guard (follow-up to INFRA-dialog-close-label-i18n): the nav
 * landmark label, Previous/Next accessible names + visible text, and the
 * ellipsis "more pages" sr-only text must come from the message catalogue for
 * the ACTIVE locale, not a hardcoded English literal.
 */
export const LocaleVi: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <PaginationHarness />
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    await expect(
      body.getByRole("navigation", { name: vi.Common.pagination.nav }),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("link", { name: vi.Common.pagination.previousAriaLabel }),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("link", { name: vi.Common.pagination.nextAriaLabel }),
    ).toBeInTheDocument();
    await expect(
      body.getByText(vi.Common.pagination.morePages),
    ).toBeInTheDocument();
  },
};

export const LocaleEn: Story = {
  render: () => (
    <NextIntlClientProvider locale="en" messages={en}>
      <PaginationHarness />
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    await expect(
      body.getByRole("navigation", { name: en.Common.pagination.nav }),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("link", { name: en.Common.pagination.previousAriaLabel }),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("link", { name: en.Common.pagination.nextAriaLabel }),
    ).toBeInTheDocument();
    await expect(
      body.getByText(en.Common.pagination.morePages),
    ).toBeInTheDocument();
    // No leftover hardcoded Vietnamese literal in English locale.
    await expect(body.queryByText(vi.Common.pagination.morePages)).toBeNull();
  },
};

/**
 * Explicit aria-label override still wins over the translated default —
 * mirrors the Sheet closeLabel escape hatch.
 */
export const AriaLabelOverride: Story = {
  render: () => (
    <NextIntlClientProvider locale="vi" messages={vi}>
      <Pagination aria-label="Custom label">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" aria-label="Custom previous" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </NextIntlClientProvider>
  ),
  play: async () => {
    const body = within(document.body);
    await expect(
      body.getByRole("navigation", { name: "Custom label" }),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("link", { name: "Custom previous" }),
    ).toBeInTheDocument();
  },
};
