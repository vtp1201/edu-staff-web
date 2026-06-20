import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import { AddMembersModal } from "./add-members-modal";

const CONTACTS: ContactEntity[] = [
  {
    id: "u4",
    name: "Lê Thị Hoa",
    role: "Giáo viên Hóa",
    avatarInitials: "LH",
    color: "warning",
    isOnline: true,
  },
  {
    id: "u5",
    name: "Phạm Văn Sơn",
    role: "Giáo viên Lý",
    avatarInitials: "PS",
    color: "info",
    isOnline: false,
  },
];

const meta: Meta<typeof AddMembersModal> = {
  title: "Features/Messaging/AddMembersModal",
  component: AddMembersModal,
  parameters: { layout: "centered" },
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
    isSubmitting: false,
    submitError: false,
    onOpenChange: fn(),
    onSubmit: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof AddMembersModal>;

/** Default — eligible contacts listed; submit disabled until a selection. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeInTheDocument());
    expect(body.getByText("Lê Thị Hoa")).toBeInTheDocument();
    // Submit disabled with nothing selected.
    expect(body.getByRole("button", { name: /^thêm$/i })).toBeDisabled();
  },
};

/** Selecting a contact enables the submit button and fires onSubmit. */
export const SelectAndSubmit: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByText("Lê Thị Hoa"));
    const submit = body.getByRole("button", { name: /^thêm$/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledWith(["u4"]));
  },
};

/** Empty — no eligible contacts left to add. */
export const Empty: Story = {
  args: { contacts: [] },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(
        body.getByText(/không còn thành viên nào để thêm/i),
      ).toBeInTheDocument(),
    );
  },
};

/** Submitting — spinner shown, submit disabled. */
export const Submitting: Story = {
  args: { isSubmitting: true },
};

/** Error — failure alert displayed. */
export const SubmitError: Story = {
  args: { submitError: true },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("alert")).toBeInTheDocument());
  },
};
