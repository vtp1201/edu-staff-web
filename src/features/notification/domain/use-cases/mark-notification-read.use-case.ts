import type { NotificationFailure } from "../failures/notification.failure";
import type { INotificationRepository } from "../repositories/i-notification.repository";

export class MarkNotificationReadUseCase {
  constructor(private readonly repo: INotificationRepository) {}

  async execute(id: string): Promise<void> {
    if (!id?.trim()) {
      const failure: NotificationFailure = { type: "not-found" };
      throw failure;
    }
    return this.repo.markRead(id);
  }
}
