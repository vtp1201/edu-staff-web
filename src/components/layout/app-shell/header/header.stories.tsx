import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import {
  expect,
  userEvent,
  waitForElementToBeRemoved,
  within,
} from "storybook/test";
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

/**
 * Regression guard for A11Y-001 (US-E23.1): the dialog is opened via the REAL
 * composed flow (avatar trigger → dropdown → "Đổi trường" menuitem), then Escape
 * must dismiss it AND return focus to the user-menu trigger — proving the
 * DropdownMenu→Dialog handoff is not a keyboard trap (WCAG 2.1.2 / 2.4.3).
 */
export const MultiTenant_CloseRestoresFocus: Story = {
  args: {
    role: "teacher",
    userName: "Nguyen Van A",
    memberships: twoTenants,
    currentTenantId: "tenant-acme",
    onSwitchTenant: noopSwitch,
  },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole("button", {
      name: "Menu người dùng",
    });
    await userEvent.click(trigger);
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: /Đổi trường/ }),
    );
    // The dialog opens only after the dropdown has fully unmounted (see
    // Header.openSwitchDialog). Two invariants that were broken before the fix:
    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    // (1) focus moves INTO the dialog, not stuck on the trigger behind the modal
    await expect(dialog.contains(document.activeElement)).toBe(true);
    // (2) the dropdown is gone — otherwise its dismissable layer swallows the
    //     Escape meant for the dialog (the original keyboard trap).
    await expect(body.queryByRole("menu")).not.toBeInTheDocument();

    // Escape dismisses the dialog (proves it is NOT a keyboard trap). Wait for
    // the close animation to unmount the node before asserting absence.
    await userEvent.keyboard("{Escape}");
    await waitForElementToBeRemoved(() => body.queryByRole("dialog"));
    // ...and focus returns to the header's user-menu trigger, not <body>.
    await expect(document.activeElement).toBe(trigger);
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
