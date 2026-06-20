import type { GroupEntity } from "../entities/group.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type {
  IMessagingRepository,
  UpdateGroupInput,
} from "../repositories/i-messaging.repository";
import { fail, type Result } from "./result";

const MIN_NAME = 2;
const MAX_NAME = 60;

export class UpdateGroupUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    input: UpdateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < MIN_NAME || name.length > MAX_NAME) {
        return fail({ type: "group-mutation-failed", cause: "validation" });
      }
      return this.repo.updateGroup({ ...input, name });
    }
    return this.repo.updateGroup(input);
  }
}
