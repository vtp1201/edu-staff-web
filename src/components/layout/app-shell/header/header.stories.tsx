import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  SwitchTenantResult,
  TenantCardViewModel,
} from "@/components/shared/tenant-card";
import { Header } from "./header";

const meta: Meta<typeof Header> = {
  title: "Layout/Header",
  component: Header,
  decorators: [
    (Story) => {
      document.body.style.pointerEvents = "";
      return (
        <NextIntlClientProvider locale="vi" messages={messages}>
          <Story />
        </NextIntlClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Teacher: Story = {
  args: { role: "teacher", userName: "Nguyen Van A" },
};
export const Student: Story = {
  args: { role: "student", userName: "Tran Thi B" },
};

const twoTenants: TenantCardViewModel[] = [
  {
    tenantId: "tenant-acme",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName: "THPT Chu Văn An",
    address: "10 Thụy Khuê, Tây Hồ, Hà Nội",
    logoColor: "primary",
    isCurrent: true,
    isSwitchable: true,
  },
  {
    tenantId: "tenant-beta",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName: "THCS Nguyễn Du",
    address: "44 Hàng Quạt, Hoàn Kiếm, Hà Nội",
    logoColor: "purple",
    isCurrent: false,
    isSwitchable: true,
  },
];

const noopSwitch = async (): Promise<SwitchTenantResult> => ({ ok: true });

/** ≥2 memberships → the "Đổi trường" item + current-tenant block render. */
export const MultiTenant: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    memberships: twoTenants,
    currentTenantId: "tenant-acme",
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    const item = await body.findByRole("menuitem", { name: /Đổi trường/ });
    await expect(item).toBeInTheDocument();
    await userEvent.click(item);
    await expect(await body.findByRole("dialog")).toBeInTheDocument();
  },
};

/** Exactly 1 membership → zero-noise: no "Đổi trường" item anywhere. */
export const SingleTenantZeroNoise: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    memberships: [twoTenants[0]],
    currentTenantId: "tenant-acme",
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    await expect(
      body.queryByRole("menuitem", { name: /Đổi trường/ }),
    ).not.toBeInTheDocument();
  },
};

/** Switch action wired but no membership data (fetch-fail []) → zero-noise. */
export const FetchFailZeroNoise: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    memberships: [],
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Menu người dùng" }),
    );
    const body = within(document.body);
    await expect(
      body.queryByRole("menuitem", { name: /Đổi trường/ }),
    ).not.toBeInTheDocument();
  },
};
