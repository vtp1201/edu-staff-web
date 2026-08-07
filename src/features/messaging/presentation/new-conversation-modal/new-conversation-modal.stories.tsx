import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import { NewConversationModal } from "./new-conversation-modal";

const CONTACTS: ContactEntity[] = [
  {
    id: "u4",
    name: "Lê Thị Hoa",
    roleKey: "teacher",
    avatarInitials: "LH",
    color: "warning",
    isOnline: true,
  },
  {
    id: "u5",
    name: "Phạm Văn Sơn",
    roleKey: "teacher",
    avatarInitials: "PS",
    color: "info",
    isOnline: false,
  },
];

const meta: Meta<typeof NewConversationModal> = {
  title: "Features/Messaging/NewConversationModal",
  component: NewConversationModal,
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
    onOpenChange: fn(),
    onSelectContact: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof NewConversationModal>;

/** Default — narrowed-tier contacts listed under the suggestions heading. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeInTheDocument());
    expect(body.getByText("Gợi ý")).toBeInTheDocument();
    await userEvent.click(body.getByText("Lê Thị Hoa"));
    await waitFor(() =>
      expect(args.onSelectContact).toHaveBeenCalledWith(CONTACTS[0]),
    );
  },
};

/**
 * US-E18.52 (review fix) — a real tenant whose `role=TEACHER` directory query
 * returns ZERO rows. Previously unreachable (the mock always seeded contacts),
 * so the heading rendered with nothing under it.
 */
export const EmptyDirectory: Story = {
  args: { contacts: [] },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(
        body.getByText(/chưa có liên hệ nào để nhắn tin/i),
      ).toBeInTheDocument(),
    );
    // The empty state REPLACES the list — no bare heading over nothing.
    expect(body.queryByRole("list")).not.toBeInTheDocument();
  },
};

/**
 * US-E18.52 (review fix) — the SSR contact-directory read FAILED (403
 * forbidden, a `role=` wiring bug, or transport). The picker must say so; an
 * empty list here would read as "this school has no teachers".
 */
export const ContactsLoadForbidden: Story = {
  args: { contacts: [], contactsError: "load-contacts-failed" },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const alert = await waitFor(() => body.getByRole("alert"));
    expect(alert).toHaveTextContent(/không thể tải danh bạ liên hệ/i);
    // The failure REPLACES both the suggestions heading and the empty copy —
    // the two must never be shown together (contradictory explanations).
    expect(body.queryByText("Gợi ý")).not.toBeInTheDocument();
    expect(
      body.queryByText(/chưa có liên hệ nào để nhắn tin/i),
    ).not.toBeInTheDocument();
  },
};
