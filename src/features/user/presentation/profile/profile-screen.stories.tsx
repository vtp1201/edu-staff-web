import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ProfileScreen } from "./profile-screen";

const meta: Meta<typeof ProfileScreen> = {
  title: "Profile/ProfileScreen",
  component: ProfileScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ProfileScreen>;

export const Default: Story = {
  args: {
    fullName: "Nguyễn Văn A",
    email: "a@school.edu.vn",
    phone: "0901 234 567",
    role: "teacher",
    sessions: [
      {
        id: "1",
        device: "Chrome · macOS",
        lastActive: "vừa xong",
        current: true,
      },
      {
        id: "2",
        device: "Safari · iPhone",
        lastActive: "2 giờ trước",
        current: false,
      },
    ],
  },
};
