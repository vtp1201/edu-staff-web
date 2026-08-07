import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MessagingScreenProps } from "@/features/messaging/presentation/messaging-screen/messaging-screen";

/**
 * RSC page composition proof (US-E18.52 review fix). The repo's vitest env is
 * `node` with no renderer for async server components, so we await the element
 * the page returns and assert the props it hands the client screen — the same
 * technique US-E13.10 / US-E23.2 use.
 *
 * The behaviour under test: a FAILED contacts load must reach the screen as a
 * stable failure key, never be swallowed into `[]` (an empty picker is
 * indistinguishable from "this school genuinely has no teachers").
 */

const conversationsExecute = vi.fn();
const contactsExecute = vi.fn();

vi.mock("@/bootstrap/di", () => ({
  makeGetConversationsUseCase: async () => ({
    execute: conversationsExecute,
  }),
  makeGetContactsUseCase: async () => ({ execute: contactsExecute }),
}));

vi.mock("./actions", () => ({
  addGroupMembersAction: vi.fn(),
  createConversationAction: vi.fn(),
  createGroupAction: vi.fn(),
  deleteGroupAction: vi.fn(),
  deleteMessageAction: vi.fn(),
  getGroupAction: vi.fn(),
  getMessagesAction: vi.fn(),
  getPresenceAction: vi.fn(),
  leaveGroupAction: vi.fn(),
  markConversationReadAction: vi.fn(),
  pinMessageAction: vi.fn(),
  removeGroupMemberAction: vi.fn(),
  sendMessageAction: vi.fn(),
  sendTypingIndicatorAction: vi.fn(),
  updateGroupAction: vi.fn(),
}));

vi.mock("@/features/messaging/presentation/messaging-screen", () => ({
  MessagingScreen: () => null,
}));

async function renderPageProps(): Promise<MessagingScreenProps> {
  const { default: MessagesPage } = await import("./page");
  const el = (await MessagesPage({
    params: Promise.resolve({ tenant: "t-1" }),
  })) as ReactElement<MessagingScreenProps>;
  return el.props;
}

const CONTACT = {
  id: "u1",
  name: "Lê Thị Hoa",
  avatarInitials: "LH",
  color: "warning" as const,
  isOnline: false,
};

describe("MessagesPage (contacts load)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conversationsExecute.mockResolvedValue({ ok: true, value: [] });
  });

  it("passes the loaded contacts and no contacts error on success", async () => {
    contactsExecute.mockResolvedValue({ ok: true, value: [CONTACT] });

    const props = await renderPageProps();

    expect(props.initialContacts).toEqual([CONTACT]);
    expect(props.contactsLoadError).toBeUndefined();
  });

  it("surfaces a contacts failure as a stable key instead of an empty list", async () => {
    contactsExecute.mockResolvedValue({
      ok: false,
      failure: { type: "load-contacts-failed", cause: "forbidden" },
    });

    const props = await renderPageProps();

    expect(props.contactsLoadError).toBe("load-contacts-failed");
    // Still an empty array (the picker has nothing to render) — but the screen
    // now knows WHY, so it can say so instead of rendering a bare empty list.
    expect(props.initialContacts).toEqual([]);
  });

  it("keeps the conversations failure channel independent of contacts", async () => {
    conversationsExecute.mockResolvedValue({
      ok: false,
      failure: { type: "load-conversations-failed" },
    });
    contactsExecute.mockResolvedValue({ ok: true, value: [CONTACT] });

    const props = await renderPageProps();

    expect(props.loadError).toBe("load-conversations-failed");
    expect(props.contactsLoadError).toBeUndefined();
    expect(props.initialContacts).toEqual([CONTACT]);
  });
});
