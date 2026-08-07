import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeSearchMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeSubClaim, decodeTenantId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IMessagingRepository } from "@/features/messaging/domain/repositories/i-messaging.repository";
import type { IPresenceRepository } from "@/features/messaging/domain/repositories/i-presence.repository";
import { AddGroupMembersUseCase } from "@/features/messaging/domain/use-cases/add-group-members.use-case";
import { CreateConversationUseCase } from "@/features/messaging/domain/use-cases/create-conversation.use-case";
import { CreateGroupUseCase } from "@/features/messaging/domain/use-cases/create-group.use-case";
import { DeleteGroupUseCase } from "@/features/messaging/domain/use-cases/delete-group.use-case";
import { DeleteMessageUseCase } from "@/features/messaging/domain/use-cases/delete-message.use-case";
import { GetContactsUseCase } from "@/features/messaging/domain/use-cases/get-contacts.use-case";
import { GetConversationsUseCase } from "@/features/messaging/domain/use-cases/get-conversations.use-case";
import { GetGroupUseCase } from "@/features/messaging/domain/use-cases/get-group.use-case";
import { GetMessagesUseCase } from "@/features/messaging/domain/use-cases/get-messages.use-case";
import { GetPinnedMessagesUseCase } from "@/features/messaging/domain/use-cases/get-pinned-messages.use-case";
import { GetPresenceUseCase } from "@/features/messaging/domain/use-cases/get-presence.use-case";
import { LeaveGroupUseCase } from "@/features/messaging/domain/use-cases/leave-group.use-case";
import { MarkConversationReadUseCase } from "@/features/messaging/domain/use-cases/mark-conversation-read.use-case";
import { PinMessageUseCase } from "@/features/messaging/domain/use-cases/pin-message.use-case";
import { RemoveGroupMemberUseCase } from "@/features/messaging/domain/use-cases/remove-group-member.use-case";
import { SendMessageUseCase } from "@/features/messaging/domain/use-cases/send-message.use-case";
import { SendTypingIndicatorUseCase } from "@/features/messaging/domain/use-cases/send-typing-indicator.use-case";
import { UnpinMessageUseCase } from "@/features/messaging/domain/use-cases/unpin-message.use-case";
import { UpdateGroupUseCase } from "@/features/messaging/domain/use-cases/update-group.use-case";
import { HybridMessagingRepository } from "@/features/messaging/infrastructure/repositories/hybrid-messaging.repository";
import { MessagingRepository } from "@/features/messaging/infrastructure/repositories/messaging.repository";
import { MockMessagingRepository } from "@/features/messaging/infrastructure/repositories/mocks/messaging.mock.repository";
import { MockPresenceRepository } from "@/features/messaging/infrastructure/repositories/mocks/presence.mock.repository";
import { PresenceRepository } from "@/features/messaging/infrastructure/repositories/presence.repository";

/**
 * Which staff role the contact picker lists (US-E18.52, IAM ADR 0129).
 *
 * IAM now serves the member directory to a NARROWED tier (STAFF/STUDENT/PARENT
 * callers) but makes `role=` REQUIRED there, restricted to
 * `ADMIN|MANAGER|TEACHER|STAFF` — a student/parent can never list other
 * students/parents through this endpoint, so ONE of those four must be pinned.
 *
 * `TEACHER` is the documented choice: neither `docs/product/design-spec.jsonc`
 * nor `docs/product/screens.md` scopes the messaging contact picker, and the
 * picker's primary job for a STUDENT/PARENT is "nhắn cho giáo viên của tôi".
 * It matches the filter every other directory composition already pins
 * (`class-management.di.ts`, `principal-teachers.di.ts`), and the same query
 * serves a staff-tier caller unchanged — they additionally receive the full
 * row, of which the picker uses only the three shared fields.
 *
 * The endpoint takes ONE role, so covering several would mean N drains of the
 * whole directory: a deliberate single value, not an oversight.
 */
const CONTACT_PICKER_ROLE = "TEACHER" as const;

async function makeRepo(): Promise<IMessagingRepository> {
  if (USE_MOCK) return new MockMessagingRepository();
  // decision 0018 — proactive refresh BEFORE the shared http client is created.
  await ensureFreshSession();
  const http = await createServerHttpClient();
  const token = await getAccessToken();
  const currentUserId = token ? decodeSubClaim(token) : null;
  const tenantId = decodeTenantId(token ?? "") ?? "";
  // The contact picker reads `iam`, not `social` — one repository never spans
  // two services (decision 0017), so `iam-directory`'s SearchMembersUseCase
  // (which owns the "trust hasMore, not page length" draining loop) is
  // COMPOSED here, the only layer allowed to cross features. Same precedent as
  // `class-management.di.ts` / `principal-teachers.di.ts`.
  const searchMembers = await makeSearchMembersUseCase();

  // ADR 0060 partial-real facade: the rooms/messages/read/typing/1:1-DM slice
  // plus the US-E18.51 pin slice (BE US-192), contacts (US-E18.52) and the
  // US-E18.50 group create/archive pair are served by the real repo; the rest
  // of the group lifecycle has no real contract and is force-mocked
  // regardless of USE_MOCK.
  return new HybridMessagingRepository(
    new MessagingRepository(http, currentUserId, {
      role: CONTACT_PICKER_ROLE,
      list: () =>
        searchMembers.execute({ tenantId, role: CONTACT_PICKER_ROLE }),
    }),
    new MockMessagingRepository(),
  );
}

/**
 * INT-401 presence — a separate small factory (`noti`, not `social`); does not
 * touch the `makeRepo()` used by the 12 IMessagingRepository methods.
 */
async function makePresenceRepo(): Promise<IPresenceRepository> {
  if (USE_MOCK) return new MockPresenceRepository();
  // decision 0018 — proactive refresh BEFORE the shared http client is created.
  await ensureFreshSession();
  return new PresenceRepository(await createServerHttpClient());
}

export async function makeGetConversationsUseCase() {
  return new GetConversationsUseCase(await makeRepo());
}

export async function makeGetMessagesUseCase() {
  return new GetMessagesUseCase(await makeRepo());
}

export async function makeSendMessageUseCase() {
  return new SendMessageUseCase(await makeRepo());
}

export async function makeCreateConversationUseCase() {
  return new CreateConversationUseCase(await makeRepo());
}

export async function makeGetContactsUseCase() {
  return new GetContactsUseCase(await makeRepo());
}

// --- US-E10.6 presence (INT-401, noti service — mock-first) ---

export async function makeGetPresenceUseCase() {
  return new GetPresenceUseCase(await makePresenceRepo());
}

// --- US-E10.4 group lifecycle + message interactions ---

export async function makeCreateGroupUseCase() {
  return new CreateGroupUseCase(await makeRepo());
}

export async function makeGetGroupUseCase() {
  return new GetGroupUseCase(await makeRepo());
}

export async function makeUpdateGroupUseCase() {
  return new UpdateGroupUseCase(await makeRepo());
}

export async function makeAddGroupMembersUseCase() {
  return new AddGroupMembersUseCase(await makeRepo());
}

export async function makeRemoveGroupMemberUseCase() {
  return new RemoveGroupMemberUseCase(await makeRepo());
}

export async function makeLeaveGroupUseCase() {
  return new LeaveGroupUseCase(await makeRepo());
}

export async function makeDeleteGroupUseCase() {
  return new DeleteGroupUseCase(await makeRepo());
}

export async function makePinMessageUseCase() {
  return new PinMessageUseCase(await makeRepo());
}

export async function makeUnpinMessageUseCase() {
  return new UnpinMessageUseCase(await makeRepo());
}

export async function makeGetPinnedMessagesUseCase() {
  return new GetPinnedMessagesUseCase(await makeRepo());
}

export async function makeDeleteMessageUseCase() {
  return new DeleteMessageUseCase(await makeRepo());
}

// --- US-E18.17 read-state + typing (real `social` rooms) ---

export async function makeMarkConversationReadUseCase() {
  return new MarkConversationReadUseCase(await makeRepo());
}

export async function makeSendTypingIndicatorUseCase() {
  return new SendTypingIndicatorUseCase(await makeRepo());
}
