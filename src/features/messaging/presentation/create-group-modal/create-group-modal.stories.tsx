import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import { CreateGroupModal } from "./create-group-modal";

const CONTACTS: ContactEntity[] = [
  {
    id: "u1",
    name: "Trần Minh Quân",
    role: "Hiệu trưởng",
    avatarInitials: "TQ",
    color: "success",
    isOnline: true,
  },
  {
    id: "u2",
    name: "Phạm Quốc Bảo",
    role: "Giáo viên Văn",
    avatarInitials: "PB",
    color: "purple",
    isOnline: false,
  },
  {
    id: "u4",
    name: "Lê Thị Hoa",
    role: "Giáo viên Hóa",
    avatarInitials: "LH",
    color: "warning",
    isOnline: true,
  },
];

const meta: Meta<typeof CreateGroupModal> = {
  title: "Features/Messaging/CreateGroupModal",
  component: CreateGroupModal,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    open: true,
    contacts: CONTACTS,
    onOpenChange: () => {},
    onSubmit: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof CreateGroupModal>;
const body = () => within(document.body);

/** Step 1 default — Next disabled, avatar preview shows fallback. */
export const CreateGroup_Step1_Empty: Story = {
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("Thông tin nhóm")).toBeInTheDocument(),
    );
    await expect(body().getByText("Tiếp theo")).toBeDisabled();
  },
};

/** Step 1 valid — name filled + color selected → Next enabled. */
export const CreateGroup_Step1_Valid: Story = {
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("Thông tin nhóm")).toBeInTheDocument(),
    );
    const name = body().getByLabelText("Tên nhóm");
    await userEvent.type(name, "Nhóm Toán");
    await expect(body().getByText("Tiếp theo")).toBeEnabled();
  },
};

/** Step 1 validation error — name <2 chars after blur. */
export const CreateGroup_Step1_ValidationError: Story = {
  play: async () => {
    const name = await waitFor(() => body().getByLabelText("Tên nhóm"));
    await userEvent.type(name, "A");
    await userEvent.tab();
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    await expect(body().getByText("Tiếp theo")).toBeDisabled();
  },
};

async function advanceToStep2() {
  const name = await waitFor(() => body().getByLabelText("Tên nhóm"));
  await userEvent.type(name, "Nhóm Toán");
  await userEvent.click(body().getByText("Tiếp theo"));
  await waitFor(() =>
    expect(body().getByText("Thêm thành viên")).toBeInTheDocument(),
  );
}

/** Step 2 with no members — Submit disabled. */
export const CreateGroup_Step2_NoMembers: Story = {
  play: async () => {
    await advanceToStep2();
    await expect(body().getByText("Tạo nhóm")).toBeDisabled();
  },
};

/** Step 2 with members — chips render, Submit enabled. */
export const CreateGroup_Step2_WithMembers: Story = {
  play: async () => {
    await advanceToStep2();
    await userEvent.click(body().getByText("Trần Minh Quân"));
    await userEvent.click(body().getByText("Lê Thị Hoa"));
    await waitFor(() => expect(body().getByText("Tạo nhóm")).toBeEnabled());
  },
};

/** Submit loading — isSubmitting disables the create button. */
export const CreateGroup_Submit_Loading: Story = {
  args: { isSubmitting: true },
  play: async () => {
    await advanceToStep2();
    await userEvent.click(body().getByText("Trần Minh Quân"));
    await expect(body().getByText("Tạo nhóm")).toBeDisabled();
  },
};

/** Submit error — inline error banner is shown. */
export const CreateGroup_Submit_Error: Story = {
  args: { submitError: true },
  play: async () => {
    await waitFor(() => expect(body().getByRole("alert")).toBeInTheDocument());
  },
};

/** Mobile viewport. */
export const Mobile_375: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  globals: { viewport: { value: "mobile1" } },
};
