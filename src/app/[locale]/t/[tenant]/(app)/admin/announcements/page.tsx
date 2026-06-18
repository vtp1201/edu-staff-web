import { makeGetAnnouncementsUseCase } from "@/bootstrap/di/announcements.di";
import type { AnnouncementEntity } from "@/features/announcements/domain/entities/announcement.entity";
import { AnnouncementsScreen } from "@/features/announcements/presentation/announcements-screen/announcements-screen";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  fetchAnnouncementsAction,
  getRecipientsAction,
  sendReminderAction,
  updateAnnouncementAction,
} from "./actions";

export default async function AnnouncementsPage() {
  const useCase = await makeGetAnnouncementsUseCase();
  let initialItems: AnnouncementEntity[] = [];
  let loadFailed = false;
  try {
    initialItems = await useCase.execute("all");
  } catch {
    loadFailed = true;
  }

  return (
    <AnnouncementsScreen
      initialItems={initialItems}
      loadFailed={loadFailed}
      fetchListAction={fetchAnnouncementsAction}
      onCreate={createAnnouncementAction}
      onUpdate={updateAnnouncementAction}
      onDelete={deleteAnnouncementAction}
      onGetRecipients={getRecipientsAction}
      onRemind={sendReminderAction}
    />
  );
}
