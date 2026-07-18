import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  SwitchTenantResult,
  TenantCardViewModel,
} from "./tenant-card.i-vm";
import { TenantSwitchDialog } from "./tenant-switch-dialog";

const memberships: TenantCardViewModel[] = [
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

function Harness({
  items = memberships,
  onSwitchTenant = async () => ({ ok: true }) as SwitchTenantResult,
}: {
  items?: TenantCardViewModel[];
  onSwitchTenant?: (
    tenantId: string,
    role: string,
  ) => Promise<SwitchTenantResult>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <button type="button" onClick={() => setOpen(true)}>
        Mở
      </button>
      <TenantSwitchDialog
        open={open}
        onOpenChange={setOpen}
        memberships={items}
        onSwitchTenant={onSwitchTenant}
      />
    </NextIntlClientProvider>
  );
}

const meta: Meta<typeof Harness> = {
  title: "Shared/TenantSwitchDialog",
  component: Harness,
  // Radix locks body pointer-events while a dialog/portal is open — reset so a
  // busy-and-left-open story doesn't bleed into the next one.
  decorators: [
    (Story) => {
      document.body.style.pointerEvents = "";
      return <Story />;
    },
  ],
};
export default meta;
type Story = StoryObj<typeof Harness>;

export const OpenCardList: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(within(dialog).getByText("Chọn trường")).toBeInTheDocument();
    // one <button> per membership + the close button
    await expect(within(dialog).getByText("THPT Chu Văn An")).toBeVisible();
    await expect(within(dialog).getByText("THCS Nguyễn Du")).toBeVisible();
    // current card carries the "Hiện tại" badge
    await expect(within(dialog).getByText("Hiện tại")).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(
      within(dialog).getByText("Không có trường nào để chuyển"),
    ).toBeInTheDocument();
  },
};

export const ForbiddenInlineError: Story = {
  args: {
    onSwitchTenant: async () => ({ ok: false, errorKey: "forbidden" }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    // activate the non-current card
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Nguyễn Du/ }),
    );
    // inline card error appears; dialog stays open (no navigation)
    await expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    await expect(dialog).toBeInTheDocument();
  },
};

export const DismissBlockedWhileBusy: Story = {
  args: {
    // never-resolving switch keeps the card in its loading state
    onSwitchTenant: () => new Promise<never>(() => {}),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Nguyễn Du/ }),
    );
    // busy → Escape must NOT close the dialog (FR-006)
    await userEvent.keyboard("{Escape}");
    await expect(body.getByRole("dialog")).toBeInTheDocument();
  },
};
