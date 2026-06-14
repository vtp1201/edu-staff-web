import { ProfileScreen } from "@/features/user/presentation/profile";
import {
  getLinkedAccountsAction,
  linkAccountAction,
  unlinkAccountAction,
} from "./actions";

// Mock VM — wire to GET /users/me + sessions when the BE profile slice lands.
const MOCK = {
  fullName: "Nguyễn Văn A",
  email: "a@school.edu.vn",
  phone: "0901 234 567",
  role: "teacher",
  sessions: [
    {
      id: "1",
      device: "Chrome · macOS",
      lastActive: "vừa xong",
      current: true,
    },
    {
      id: "2",
      device: "Safari · iPhone",
      lastActive: "2 giờ trước",
      current: false,
    },
  ],
};

export default async function ProfilePage() {
  const linkedAccounts = await getLinkedAccountsAction();
  return (
    <ProfileScreen
      {...MOCK}
      linkedAccounts={linkedAccounts}
      onLinkAccount={linkAccountAction}
      onUnlinkAccount={unlinkAccountAction}
      onFetchLinkedAccounts={getLinkedAccountsAction}
    />
  );
}
