import { NotificationsCenterContainer } from "@/features/notification/presentation/notifications-center/notifications-center-container";
import {
  fetchPageAction,
  fetchUnreadCountAction,
  markAllReadAction,
  markReadAction,
} from "./actions";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  return (
    <NotificationsCenterContainer
      tenantId={tenant}
      fetchPageAction={fetchPageAction}
      fetchUnreadCountAction={fetchUnreadCountAction}
      markReadAction={markReadAction}
      markAllReadAction={markAllReadAction}
    />
  );
}
