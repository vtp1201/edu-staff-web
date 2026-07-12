import { makeGetProfileUseCase } from "@/bootstrap/di/auth.di";
import { ProfileScreen } from "@/features/user/presentation/profile";
import {
  confirmEmailVerificationAction,
  requestEmailVerificationAction,
} from "../../email-verification.actions";
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
  // Real email from GET /users/me (US-E22.1); rest of MOCK stays until the BE
  // profile slice lands (out of scope, plan §0.6). Verification status itself
  // is served reactively from EmailVerifyProvider context, not this VM.
  const profile = await makeGetProfileUseCase().then((uc) => uc.execute());
  return (
    <ProfileScreen
      {...MOCK}
      email={profile.data?.email ?? MOCK.email}
      linkedAccounts={linkedAccounts}
      onLinkAccount={linkAccountAction}
      onUnlinkAccount={unlinkAccountAction}
      onFetchLinkedAccounts={getLinkedAccountsAction}
      onConfirmEmailVerification={confirmEmailVerificationAction}
      onRequestEmailVerification={requestEmailVerificationAction}
    />
  );
}
