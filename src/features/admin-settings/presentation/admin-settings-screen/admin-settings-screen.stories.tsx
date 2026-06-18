import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import { AdminSettingsScreen } from "./admin-settings-screen";

const okUpdate = async () => ({ ok: true as const });
const failUpdate = async () => ({
  ok: false as const,
  errorKey: "network-error",
});

const meta: Meta<typeof AdminSettingsScreen> = {
  title: "Admin/AdminSettingsScreen",
  component: AdminSettingsScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
        <Toaster />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AdminSettingsScreen>;

export const Loading: Story = {
  args: {
    initialMode: null,
    loading: true,
    onUpdateMode: okUpdate,
  },
};

export const SelfPublishActive: Story = {
  args: {
    initialMode: "SELF_PUBLISH",
    onUpdateMode: okUpdate,
  },
};

export const AdminApprovalActive: Story = {
  args: {
    initialMode: "ADMIN_APPROVAL",
    onUpdateMode: okUpdate,
  },
};

export const ReadOnly: Story = {
  args: {
    initialMode: "ADMIN_APPROVAL",
    isReadOnly: true,
    onUpdateMode: okUpdate,
  },
};

export const SwitchToSelfPublishWarning: Story = {
  args: {
    initialMode: "ADMIN_APPROVAL",
    onUpdateMode: okUpdate,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /Tự công bố/i }));
    await userEvent.click(canvas.getByRole("button", { name: /Lưu cài đặt/i }));
    const dialog = within(document.body);
    await expect(
      await dialog.findByText("Chuyển sang Tự công bố?"),
    ).toBeInTheDocument();
  },
};

export const SaveSuccess: Story = {
  args: {
    initialMode: "SELF_PUBLISH",
    onUpdateMode: okUpdate,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Switch SELF_PUBLISH → ADMIN_APPROVAL (no confirm needed), then save.
    await userEvent.click(
      canvas.getByRole("radio", { name: /Duyệt bởi BGH/i }),
    );
    await userEvent.click(canvas.getByRole("button", { name: /Lưu cài đặt/i }));
    const body = within(document.body);
    await expect(
      await body.findByText("Đã cập nhật cài đặt"),
    ).toBeInTheDocument();
  },
};

export const SaveError: Story = {
  args: {
    initialMode: "SELF_PUBLISH",
    onUpdateMode: failUpdate,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("radio", { name: /Duyệt bởi BGH/i }),
    );
    await userEvent.click(canvas.getByRole("button", { name: /Lưu cài đặt/i }));
    const body = within(document.body);
    await expect(
      await body.findByText("Lưu không thành công, vui lòng thử lại"),
    ).toBeInTheDocument();
  },
};
