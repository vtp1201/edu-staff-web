/** A dashboard notification entry. `icon` is a stable lucide icon key; `color`
 *  is a semantic tone key resolved to a token at presentation. */
export interface NotificationItem {
  icon: string;
  color: string;
  message: string;
  timeAgo: string;
}
