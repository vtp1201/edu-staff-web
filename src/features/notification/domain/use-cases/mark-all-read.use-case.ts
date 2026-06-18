import type { INotificationRepository } from "../repositories/i-notification.repository";

export class MarkAllReadUseCase {
  constructor(private readonly repo: INotificationRepository) {}

  async execute(): Promise<void> {
    return this.repo.markAllRead();
  }
}
