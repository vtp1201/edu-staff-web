import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { TenantCard } from "./tenant-card";
import type { TenantCardViewModel } from "./tenant-card.i-vm";

const base: TenantCardViewModel = {
  tenantId: "tenant-acme",
  roles: ["teacher"],
  status: "ACTIVE",
  tenantName: "THPT Chu Văn An",
  address: "10 Thụy Khuê, Tây Hồ, Hà Nội",
  logoColor: "primary",
  isCurrent: false,
  isSwitchable: true,
};

const meta: Meta<typeof TenantCard> = {
  title: "Shared/TenantCard",
  component: TenantCard,
  args: { onActivate: fn(), status: { kind: "idle" }, viewModel: base },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="w-[400px]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof TenantCard>;

export const Idle: Story = {
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole("button");
    await expect(button).toHaveAccessibleName(/Chu Văn An/);
    await userEvent.click(button);
    await expect(args.onActivate).toHaveBeenCalledWith("tenant-acme");
  },
};

export const Current: Story = {
  args: {
    viewModel: { ...base, isCurrent: true },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Hiện tại")).toBeInTheDocument();
    await expect(canvas.getByRole("button")).toHaveAttribute(
      "aria-current",
      "true",
    );
  },
};

export const Loading: Story = {
  args: {
    viewModel: { ...base, tenantId: "tenant-beta" },
    status: { kind: "loading" },
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button");
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    // sr-only "Đang chuyển…" announced via role=status
    await expect(within(button).getByRole("status")).toBeInTheDocument();
  },
};

export const ForbiddenError: Story = {
  args: {
    status: { kind: "error", reason: "forbidden" },
  },
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(alert).toBeInTheDocument();
  },
};

export const ParentRole: Story = {
  args: {
    viewModel: {
      ...base,
      tenantId: "tenant-beta",
      roles: ["parent"],
      tenantName: "THCS Nguyễn Du",
      logoColor: "purple",
    },
  },
};
