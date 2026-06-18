import type { ContactEntity } from "../entities/contact.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

export class GetContactsUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  execute(): Promise<Result<ContactEntity[], MessagingFailure>> {
    return this.repo.getContacts();
  }
}
