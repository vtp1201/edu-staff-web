import type { GroupEntity } from "../entities/group.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type {
  CreateGroupInput,
  IMessagingRepository,
} from "../repositories/i-messaging.repository";
import { fail, type Result } from "./result";

const MIN_NAME = 2;

export class CreateGroupUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    const name = input.name.trim();
    if (name.length < MIN_NAME) {
      return fail({ type: "create-group-failed", cause: "validation" });
    }
    if (input.memberIds.length < 1) {
      return fail({ type: "create-group-failed", cause: "validation" });
    }
    return this.repo.createGroup({ ...input, name });
  }
}
