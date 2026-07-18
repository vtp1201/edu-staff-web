import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { TenantAccentTone } from "./tenant-card.i-vm";
import { TenantLogo } from "./tenant-logo";

const meta: Meta<typeof TenantLogo> = {
  title: "Shared/TenantLogo",
  component: TenantLogo,
};
export default meta;
type Story = StoryObj<typeof TenantLogo>;

const TONES: TenantAccentTone[] = [
  "primary",
  "success",
  "warning",
  "info",
  "purple",
  "teal",
];

export const CardSize: Story = {
  args: { size: 56, tenantName: "THPT Chu Văn An", accentTone: "primary" },
};

export const HeaderSize: Story = {
  args: { size: 36, tenantName: "THCS Nguyễn Du", accentTone: "purple" },
};

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {TONES.map((tone) => (
        <TenantLogo
          key={tone}
          size={56}
          tenantName={`${tone} School`}
          accentTone={tone}
        />
      ))}
    </div>
  ),
};
