import type {
  NotificationFilter,
  NotificationPage,
} from "../entities/notification.entity";
import type { INotificationRepository } from "../repositories/i-notification.repository";

export class GetNotificationsUseCase {
  constructor(private readonly repo: INotificationRepository) {}

  async execute(params: {
    filter: NotificationFilter;
    cursor?: string;
    limit?: number;
  }): Promise<NotificationPage> {
    return this.repo.listNotifications(params);
  }
}
