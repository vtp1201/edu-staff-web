import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { CreateGroupModal } from "./create-group-modal";

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
    onOpenChange: () => {},
    onSubmit: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof CreateGroupModal>;
const body = () => within(document.body);

/** Empty — the create button is disabled until a valid name is typed. */
export const Empty: Story = {
  play: async () => {
    await waitFor(() =>
      expect(body().getByText("Tạo nhóm mới")).toBeInTheDocument(),
    );
    await expect(body().getByText("Tạo nhóm")).toBeDisabled();
  },
};

/**
 * US-E18.50 — the form collects a NAME and nothing else: no description, no
 * group type, no colour swatch, no member picker (the real `{name}`-only body
 * would drop every one of them).
 */
export const NameOnly_NoDroppedFields: Story = {
  play: async () => {
    await waitFor(() =>
      expect(body().getByLabelText("Tên nhóm")).toBeInTheDocument(),
    );
    expect(body().queryByText("Mô tả")).not.toBeInTheDocument();
    expect(body().queryByText("Loại nhóm")).not.toBeInTheDocument();
    expect(body().queryByText("Màu nhóm")).not.toBeInTheDocument();
    expect(body().queryByText("Thêm thành viên")).not.toBeInTheDocument();
  },
};

/** Valid name → the create button submits exactly `{name}`, trimmed. */
export const Valid_SubmitsNameOnly: Story = {
  args: { onSubmit: fn() },
  play: async ({ args }) => {
    const name = await waitFor(() => body().getByLabelText("Tên nhóm"));
    await userEvent.type(name, "  Nhóm Toán  ");
    const create = body().getByText("Tạo nhóm");
    await waitFor(() => expect(create).toBeEnabled());
    await userEvent.click(create);
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({ name: "Nhóm Toán" }),
    );
  },
};

/** Validation — a 1-character name is announced as an error, not just red. */
export const ValidationError: Story = {
  play: async () => {
    const name = await waitFor(() => body().getByLabelText("Tên nhóm"));
    await userEvent.type(name, "A");
    await userEvent.tab();
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    await expect(
      body().getByText("Tên nhóm cần ít nhất 2 ký tự."),
    ).toBeInTheDocument();
    await expect(body().getByText("Tạo nhóm")).toBeDisabled();
  },
};

/** Loading — the create button is disabled while the mutation is in flight. */
export const Submitting: Story = {
  args: { isSubmitting: true },
  play: async () => {
    const name = await waitFor(() => body().getByLabelText("Tên nhóm"));
    await userEvent.type(name, "Nhóm Toán");
    await expect(body().getByText("Tạo nhóm")).toBeDisabled();
  },
};

/** Error — a retryable create failure shows the generic banner. */
export const SubmitError_Generic: Story = {
  args: { submitError: "create-group-failed" },
  play: async () => {
    const alert = await waitFor(() => body().getByRole("alert"));
    await expect(alert).toHaveTextContent("Không thể tạo nhóm");
  },
};

/**
 * Error — a 403 from the role allow-list reads as "you may not", NOT as a
 * generic "try again" (defense-in-depth: the affordance is normally hidden).
 */
export const SubmitError_Forbidden: Story = {
  args: { submitError: "create-group-forbidden" },
  play: async () => {
    const alert = await waitFor(() => body().getByRole("alert"));
    await expect(alert).toHaveTextContent("Bạn không có quyền tạo nhóm");
  },
};

/** Mobile viewport. */
export const Mobile_375: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  globals: { viewport: { value: "mobile1" } },
};
