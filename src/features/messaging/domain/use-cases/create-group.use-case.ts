import type { GroupEntity } from "../entities/group.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type {
  CreateGroupInput,
  IMessagingRepository,
} from "../repositories/i-messaging.repository";
import { fail, type Result } from "./result";

const MIN_NAME = 2;
/** `CreateGroupRoomRequest.name` is `minLength:1, maxLength:255` on the wire
 *  (BE US-193); we are deliberately stricter on the lower bound. */
const MAX_NAME = 255;

export class CreateGroupUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  /**
   * US-E18.50: creation is name-only. The real contract has no batch-add
   * surface, so members are no longer collected up front — the caller is seeded
   * as OWNER server-side and further members are added afterwards.
   */
  async execute(
    input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    const name = input.name.trim();
    if (name.length < MIN_NAME || name.length > MAX_NAME) {
      return fail({ type: "create-group-failed", cause: "validation" });
    }
    return this.repo.createGroup({ name });
  }
}
