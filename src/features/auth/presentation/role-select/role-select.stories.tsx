import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ROLE_PRESENTATION } from "./role-meta.presentation";
import { RoleSelectScreen } from "./role-select";
import type { RoleCardVM } from "./role-select.i-vm";

function card(
  roleEnum: string,
  appRole: string,
  tenantId: string,
  tenantName: string,
  tenantCode?: string,
): RoleCardVM {
  const p = ROLE_PRESENTATION[roleEnum];
  return {
    roleEnum,
    appRole,
    labelKey: p.labelKey,
    icon: p.icon,
    colorVar: p.colorVar,
    tenantId,
    tenantName,
    tenantCode,
  };
}

const teacher = card("TEACHER", "teacher", "t1", "THPT Nguyễn Du", "ND");
const admin = card("ADMIN", "principal", "t2", "THPT Lê Quý Đôn", "LQD");
const student = card("STUDENT", "student", "t3", "THPT Chu Văn An");

const meta = {
  title: "Auth/RoleSelect",
  component: RoleSelectScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    userName: "Nguyễn Văn An",
    isLoading: false,
    errorKey: null,
    onSelectRole: () => {},
    onBack: () => {},
  },
} satisfies Meta<typeof RoleSelectScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoRoles: Story = {
  args: { roleCount: 2, cards: [teacher, admin] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Giáo viên")).toBeVisible();
    await expect(canvas.getByText("Ban giám hiệu (BGH)")).toBeVisible();
  },
};

export const ThreeRoles: Story = {
  args: { roleCount: 3, cards: [teacher, admin, student] },
};

export const SingleRole: Story = {
  args: { roleCount: 1, cards: [teacher] },
};
