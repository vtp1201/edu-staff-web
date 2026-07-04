import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { LessonBankEmpty } from "./lesson-bank-empty";

const meta: Meta<typeof LessonBankEmpty> = {
  title: "Features/LessonBank/LessonBankEmpty",
  component: LessonBankEmpty,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof LessonBankEmpty>;

/**
 * Canonical shared EmptyState assertions (US-E17.7 migration):
 * role=status container, aria-hidden icon, accessible-contrast body token.
 */
async function assertCanonicalEmptyState(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const status = canvas.getByRole("status");
  await expect(status).toBeInTheDocument();
  const svg = status.querySelector("svg");
  await expect(svg).not.toBeNull();
  await expect(svg).toHaveAttribute("aria-hidden", "true");
  return status;
}

/** No lessons yet, uploader — CTA present (AC-01.x). */
export const AllVariant: Story = {
  args: { canUpload: true, hasActiveFilter: false, onUpload: fn() },
  play: async ({ canvasElement }) => {
    await assertCanonicalEmptyState(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Chưa có bài giảng")).toBeInTheDocument();
    const body = canvas.getByText(/Tải lên bài giảng đầu tiên/i);
    await expect(body.className).toContain("text-edu-text-secondary");
    await expect(body.className).not.toContain("text-muted-foreground");
  },
};

/** Active filter with no match → Search icon variant, no CTA (AC-02.x). */
export const FilterVariant: Story = {
  args: { canUpload: true, hasActiveFilter: true, onUpload: fn() },
  play: async ({ canvasElement }) => {
    await assertCanonicalEmptyState(canvasElement);
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không tìm thấy bài giảng"),
    ).toBeInTheDocument();
    const body = canvas.getByText(/Thử thay đổi bộ lọc/i);
    await expect(body.className).toContain("text-edu-text-secondary");
    // CTA is suppressed under an active filter.
    await expect(
      within(canvasElement).getByRole("status").querySelector("button"),
    ).toBeNull();
  },
};

/** Uploader clicks the CTA → onUpload fires; 44px touch target (AC-05.x). */
export const WithUpload: Story = {
  args: { canUpload: true, hasActiveFilter: false, onUpload: fn() },
  play: async ({ args, canvasElement }) => {
    await assertCanonicalEmptyState(canvasElement);
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /Tải lên bài giảng/i });
    await expect(btn.clientHeight).toBeGreaterThanOrEqual(44);
    await userEvent.click(btn);
    await expect(args.onUpload).toHaveBeenCalledTimes(1);
  },
};

/**
 * Principal role: `canUpload={false}` — CTA must NOT render even though
 * there is no active filter and an `onUpload` handler is supplied (AC-07.1).
 */
export const PrincipalNoUpload: Story = {
  args: { canUpload: false, hasActiveFilter: false, onUpload: fn() },
  play: async ({ canvasElement }) => {
    const status = await assertCanonicalEmptyState(canvasElement);
    const canvas = within(canvasElement);
    // allVariant title/body still shown to Principal.
    await expect(canvas.getByText("Chưa có bài giảng")).toBeInTheDocument();
    // CTA is suppressed — not disabled, not rendered.
    await expect(status.querySelector("button")).toBeNull();
  },
};
