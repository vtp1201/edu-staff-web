import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { BuilderActionBar } from "./builder-action-bar";

/**
 * QA NOTE (US-E17.9 gate): `@storybook/addon-viewport` is not installed in
 * this repo, so `globals.viewport`/`parameters.viewport` below do not
 * actually resize the render frame under `vitest --config
 * vitest.storybook.mts` (default chromium viewport 1280x720, above the `md:`
 * 768px breakpoint). Genuinely resize via the vitest browser context so the
 * `md:not-sr-only` collapse is really exercised, not just declared.
 */
async function resizeToMobile() {
  const { page } = await import("vitest/browser");
  await page.viewport(375, 812);
}

/**
 * AC-E17.9-21 / FR-008 (US-E17.9): exam-builder's `DetailPanelHeader` consumer.
 * Tested in isolation (not through `ExamBuilderScreen`) to avoid that screen's
 * `useRouter` mount dependency — this component takes `onBack` as a plain prop
 * and never touches navigation itself (the parent screen owns `router.push`).
 */
const meta = {
  title: "Features/ExamBank/BuilderActionBar",
  component: BuilderActionBar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    isSaving: false,
    isPublishable: true,
    onBack: fn(),
    onSaveDraft: fn(),
    onPublish: fn(),
  },
} satisfies Meta<typeof BuilderActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const back = canvas.getByRole("button", { name: "Quay lại kho đề thi" });
    await expect(back).toHaveAttribute("aria-label", "Quay lại kho đề thi");
    const rect = back.getBoundingClientRect();
    await expect(rect.height).toBeGreaterThanOrEqual(44);
    await expect(rect.width).toBeGreaterThanOrEqual(44);

    // AC-E17.9-21: clicking back calls the caller's onBack; the caller (the
    // exam-builder screen) owns router navigation, not this component.
    await userEvent.click(back);
    await expect(args.onBack).toHaveBeenCalledTimes(1);

    // Actions slot still exposes save-draft / publish beside the back button.
    await expect(
      canvas.getByRole("button", { name: "Lưu nháp" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Publish" }),
    ).toBeInTheDocument();
  },
};

export const Saving: Story = {
  args: { isSaving: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const savingBtn = canvas.getByRole("button", { name: "Đang lưu..." });
    await expect(savingBtn).toBeDisabled();
    await expect(savingBtn).toHaveAttribute("aria-busy", "true");
  },
};

export const NotPublishable: Story = {
  args: { isPublishable: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const publishBtn = canvas.getByRole("button", { name: "Publish" });
    await expect(publishBtn).toHaveAttribute("aria-disabled", "true");
  },
};

/**
 * AC-E17.9-09: below 768px, action text labels collapse to icon-only
 * (`sr-only md:not-sr-only`) while the back button keeps its full label.
 */
export const MobileViewport: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    await resizeToMobile();
    const canvas = within(canvasElement);
    const back = canvas.getByRole("button", { name: "Quay lại kho đề thi" });
    await expect(back).toBeInTheDocument();

    const saveLabel = canvas.getByText("Lưu nháp");
    const style = window.getComputedStyle(saveLabel);
    // sr-only at this viewport: visually clipped to a 1px box, not `display:none`.
    await expect(style.position).toBe("absolute");
    await expect(Number.parseInt(style.width, 10)).toBeLessThanOrEqual(1);
  },
};
