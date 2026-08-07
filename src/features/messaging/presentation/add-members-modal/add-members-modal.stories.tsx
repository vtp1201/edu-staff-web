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

/**
 * US-E18.52 (review fix) — the SSR contact-directory read FAILED. The second
 * consumer of the shared `ContactsErrorNotice`: the failure must REPLACE the
 * "no members left to add" copy, which would otherwise mislead.
 */
export const ContactsLoadForbidden: Story = {
  args: { contacts: [], contactsError: "load-contacts-failed" },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const alert = await waitFor(() => body.getByRole("alert"));
    expect(alert).toHaveTextContent(/không thể tải danh bạ liên hệ/i);
    expect(
      body.queryByText(/không còn thành viên nào để thêm/i),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.52 — contacts as the REAL IAM directory serves them to a narrowed-tier
 * (STUDENT/PARENT) caller: only `memberId`/`userId`/`displayName` are on the
 * wire, so the row carries a stable `roleKey` (translated here) and NO
 * free-text role. A row with neither must render no caption at all rather than
 * an empty line that reads as missing data.
 */
export const NarrowedTierContacts: Story = {
  args: {
    contacts: [
      {
        id: "m-1",
        name: "Lê Thị Hoa",
        roleKey: "teacher",
        avatarInitials: "LH",
        color: "warning",
        isOnline: false,
      },
      {
        id: "m-2",
        name: "Phạm Văn Sơn",
        avatarInitials: "PS",
        color: "info",
        isOnline: false,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeInTheDocument());
    // roleKey → translated caption (never a raw key, never a wire label).
    expect(body.getByText("Giáo viên")).toBeInTheDocument();
    // No role information at all → the caption line is omitted entirely.
    const row = body.getByText("Phạm Văn Sơn").parentElement;
    expect(row?.textContent).toBe("Phạm Văn Sơn");
  },
};
