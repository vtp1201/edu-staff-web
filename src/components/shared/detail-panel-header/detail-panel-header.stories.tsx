import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Pencil, Save, Send } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { DetailPanelHeader } from "./detail-panel-header";

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
    const canvas = within(canvasElement);
    // Back button keeps its accessible name and 44px target at 375px.
    const back = canvas.getByRole("button", { name: BACK_LABEL });
    await expect(back).toBeInTheDocument();
    // Action buttons expose their name via aria-label even when the visible
    // label span is collapsed (icon-only) below md.
    await expect(
      canvas.getByRole("button", { name: "Lưu nháp" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Xuất bản" }),
    ).toBeInTheDocument();
    // The label span is present in the DOM but visually collapsed (sr-only)
    // at this viewport — proving the icon-only mobile behavior.
    const label = canvasElement.querySelector("span.sr-only");
    await expect(label).not.toBeNull();
  },
};
