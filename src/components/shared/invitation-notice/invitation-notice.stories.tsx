import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTriangle, Clock } from "lucide-react";
import { expect, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { InvitationNotice } from "./invitation-notice";

const meta = {
  title: "Shared/InvitationNotice",
  component: InvitationNotice,
  parameters: { layout: "centered" },
  args: {
    tone: "error",
    icon: AlertTriangle,
    title: "Liên kết không còn hiệu lực",
    body: "Link mời này đã được sử dụng hoặc bị thu hồi. Hãy nhờ nhà trường gửi lời mời mới.",
    linkLabel: "Quay lại đăng nhập",
    linkHref: "/vi/login",
  },
} satisfies Meta<typeof InvitationNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Terminal error: announced as an alert, with a way back. */
export const ErrorTone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Quay lại đăng nhập" }),
    ).toHaveAttribute("href", "/vi/login");
  },
};

/** Warning tone for time-related states (expiry, rate limit). */
export const WarningToneWithHint: Story = {
  args: {
    tone: "warning",
    icon: Clock,
    title: "Lời mời đã hết hạn",
    body: "Link mời chỉ có hiệu lực trong thời hạn được cấp.",
    hint: "Liên hệ văn phòng nhà trường để được hỗ trợ.",
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(
        "Liên hệ văn phòng nhà trường để được hỗ trợ.",
      ),
    ).toBeVisible();
  },
};

/** With a primary way forward (used by the 409 "account already exists" state). */
export const WithPrimaryAction: Story = {
  args: {
    tone: "warning",
    title: "Email này đã có tài khoản",
    body: "Đăng nhập bằng tài khoản đó rồi tham gia trường.",
    children: (
      <Button asChild className="w-full">
        <a href="/vi/invitations/accept?token=tok-1">Đăng nhập để tham gia</a>
      </Button>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: "Đăng nhập để tham gia" }),
    ).toHaveAttribute("href", "/vi/invitations/accept?token=tok-1");
    // The trailing text link is still there — the action does not replace it.
    await expect(
      canvas.getByRole("link", { name: "Quay lại đăng nhập" }),
    ).toBeVisible();
  },
};
