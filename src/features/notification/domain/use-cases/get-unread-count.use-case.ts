import type { UnreadCount } from "../entities/notification.entity";
import type { INotificationRepository } from "../repositories/i-notification.repository";

export class GetUnreadCountUseCase {
  constructor(private readonly repo: INotificationRepository) {}

  async execute(): Promise<UnreadCount> {
    return this.repo.getUnreadCount();
  }
}
