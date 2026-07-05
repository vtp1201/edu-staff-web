import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Pencil, Save, Send } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { DetailPanelHeader } from "./detail-panel-header";

/**
 * QA NOTE (US-E17.9 gate): `@storybook/addon-viewport` is NOT installed in
 * this repo (`.storybook/main.ts` addons list), so `globals.viewport` /
 * `parameters.viewport` below are INERT decoration only — they do not resize
 * anything in either the Storybook UI or the `vitest --config
 * vitest.storybook.mts` browser runner (default Playwright chromium viewport
 * is 1280x720, well above the `md:` 768px breakpoint, so `md:not-sr-only`
 * labels never actually collapse under that default). To get REAL proof of
 * the 375px-viewport ACs (AC-E17.9-08/09), this play() calls the underlying
 * `@vitest/browser-playwright` context's `page.viewport()` to genuinely
 * resize the iframe before asserting. This is a repo-wide gap (every other
 * "MobileViewport"/"Viewport375" story in the codebase has the same inert
 * `globals.viewport` pattern) — flagged to fe-lead separately, not something
 * this story packet's tests can fix on their own for every consumer.
 */
async function resizeToMobile() {
  const { page } = await import("vitest/browser");
  await page.viewport(375, 812);
}

const meta = {
  title: "Shared/DetailPanelHeader",
  component: DetailPanelHeader,
  parameters: { layout: "fullscreen" },
  args: { onBack: fn() },
  tags: ["autodocs"],
} satisfies Meta<typeof DetailPanelHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const BACK_LABEL = "Quay lại danh sách thông báo";

export const Default: Story = {
  args: { backLabel: BACK_LABEL },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const back = canvas.getByRole("button", { name: BACK_LABEL });
    // AC-E17.9-03: aria-label equals backLabel exactly.
    await expect(back).toHaveAttribute("aria-label", BACK_LABEL);

    // AC-E17.9-12: clicking calls onBack exactly once.
    await userEvent.click(back);
    await expect(args.onBack).toHaveBeenCalledTimes(1);

    // AC-E17.9-14 / 15: keyboard Enter and Space each activate the button.
    back.focus();
    await expect(back).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(args.onBack).toHaveBeenCalledTimes(3);
  },
};

export const WithTitle: Story = {
  args: { backLabel: BACK_LABEL, title: "Thông báo quan trọng" },
};

export const WithActions: Story = {
  args: {
    backLabel: BACK_LABEL,
    actions: (
      <Button variant="ghost" size="icon" aria-label="Chỉnh sửa tên">
        <Pencil className="size-4" aria-hidden="true" />
      </Button>
    ),
  },
};

export const WithTitleAndActions: Story = {
  args: {
    backLabel: "Quay lại kho đề thi",
    title: "Đề kiểm tra giữa kỳ",
    actions: (
      <>
        <Button variant="outline" size="sm" aria-label="Lưu nháp">
          <Save className="size-4" aria-hidden="true" />
          <span className="sr-only md:not-sr-only">Lưu nháp</span>
        </Button>
        <Button size="sm" aria-label="Xuất bản">
          <Send className="size-4" aria-hidden="true" />
          <span className="sr-only md:not-sr-only">Xuất bản</span>
        </Button>
      </>
    ),
  },
};

/**
 * 375px viewport. The long title truncates with an ellipsis and does NOT
 * displace the back button or the actions zone. Action text labels use
 * `sr-only md:not-sr-only`, so they are visually hidden below `md` (icon-only)
 * while still exposing an accessible name — the action buttons also carry their
 * own `aria-label`. AC-E17.9-08 / 09.
 */
export const MobileViewport: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: {
    backLabel: BACK_LABEL,
    title: "Một tiêu đề rất dài dài dài dài dài để kiểm tra việc cắt chuỗi",
    actions: (
      <>
        <Button variant="outline" size="sm" aria-label="Lưu nháp">
          <Save className="size-4" aria-hidden="true" />
          <span className="sr-only md:not-sr-only">Lưu nháp</span>
        </Button>
        <Button size="sm" aria-label="Xuất bản">
          <Send className="size-4" aria-hidden="true" />
          <span className="sr-only md:not-sr-only">Xuất bản</span>
        </Button>
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    await resizeToMobile();
    const canvas = within(canvasElement);
    // AC-E17.9-02: back button keeps its accessible name and >=44x44 target at 375px.
    const back = canvas.getByRole("button", { name: BACK_LABEL });
    await expect(back).toBeInTheDocument();
    const backRect = back.getBoundingClientRect();
    await expect(backRect.height).toBeGreaterThanOrEqual(44);
    await expect(backRect.width).toBeGreaterThanOrEqual(44);

    // AC-E17.9-08: the long title truncates (scrollWidth > clientWidth means
    // the ellipsis is actually clipping content, not just present as a class)
    // and does NOT displace the back button or actions zone out of view.
    const title = canvasElement.querySelector("span.truncate.text-center");
    if (!title) throw new Error("title span not found");
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(back.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
    const publishBtn = canvas.getByRole("button", { name: "Xuất bản" });
    await expect(publishBtn.getBoundingClientRect().right).toBeLessThanOrEqual(
      canvasElement.getBoundingClientRect().right,
    );

    // AC-E17.9-09: action buttons expose their name via aria-label even when
    // the visible label span is collapsed (icon-only) below md.
    await expect(
      canvas.getByRole("button", { name: "Lưu nháp" }),
    ).toBeInTheDocument();
    await expect(publishBtn).toBeInTheDocument();
    // The label span is present in the DOM (accessible name intact) but
    // visually clipped to a 1px box at this viewport (`sr-only`), proving the
    // icon-only mobile collapse rather than merely asserting a class string.
    const label = canvasElement.querySelector("span.sr-only");
    if (!label) throw new Error("action label span not found");
    const labelStyle = window.getComputedStyle(label);
    await expect(labelStyle.position).toBe("absolute");
    await expect(Number.parseInt(labelStyle.width, 10)).toBeLessThanOrEqual(1);
  },
};
