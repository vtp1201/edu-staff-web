import { requireRole } from "@/bootstrap/auth-guard/require-role.server";
import { makeListFeedUseCase } from "@/bootstrap/di/feed.di";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { FeedRole } from "@/features/feed/domain/entities/feed-post.entity";
import { feedRoleOfAppRole } from "@/features/feed/domain/policies/feed-role";
import { FeedScreen } from "@/features/feed/presentation/feed-screen";
import type {
  FeedClassOption,
  FeedScreenVM,
} from "@/features/feed/presentation/feed-screen/feed-screen.i-vm";
import {
  addCommentAction,
  createPostAction,
  fetchFeedPageAction,
  listCommentsAction,
  reactToPostAction,
  removeContentAction,
  reportContentAction,
  togglePinAction,
} from "./actions";

/**
 * Guard appRole → feed role, through the SAME narrowing the author badge uses
 * (`feedRoleOfAppRole`) so the viewer's role and a post author's role can never
 * be resolved by two divergent maps (US-E18.31 fix, SHOULD-FIX 5).
 *
 * Two viewer-only widenings live here, deliberately NOT in the shared map:
 * `admin` has no feed BADGE but moderates like a principal (and is what
 * `decodeRoleClaim` returns under NEXT_PUBLIC_USE_MOCK), and an unresolved
 * viewer falls back to the least-privileged `student`.
 */
function viewerFeedRole(appRole: UserRole | null): FeedRole {
  if (appRole === "admin") return "principal";
  return feedRoleOfAppRole(appRole) ?? "student";
}

/** Class list a viewer can scope to (mock identity until IAM class-membership). */
const CLASSES_BY_ROLE: Record<FeedRole, FeedClassOption[]> = {
  teacher: [
    { classId: "11A2", className: "11A2" },
    { classId: "10B1", className: "10B1" },
    { classId: "12C3", className: "12C3" },
  ],
  principal: [
    { classId: "11A2", className: "11A2" },
    { classId: "10B1", className: "10B1" },
    { classId: "12C3", className: "12C3" },
  ],
  student: [{ classId: "11A2", className: "11A2" }],
  parent: [
    { classId: "11A2", className: "11A2" },
    { classId: "8B1", className: "8B1" },
  ],
};

/**
 * Social feed page (US-E19.1, (app)/(shared)/feed — all roles). RBAC inherited
 * from the (app) layout guard. Resolves the viewer's role + class list, seeds
 * page 1 of the default (school) feed, and hands Server Action refs to the
 * client screen. No business logic here.
 */
export default async function FeedPage() {
  const guard = await requireRole();
  const role = viewerFeedRole(guard.ok ? guard.role : null);
  const myClasses = CLASSES_BY_ROLE[role];

  const useCase = await makeListFeedUseCase();
  const result = await useCase.execute({ scope: "school" }, null);

  const vm: FeedScreenVM = {
    role,
    meId: "me",
    meDisplayName: "Bạn",
    meAvatarInitials: "B",
    myClasses,
    teacherClassIds: role === "teacher" ? myClasses.map((c) => c.classId) : [],
    // US-E18.31 — reads are real; every write degrades to `forbidden` in real
    // mode (HybridFeedRepository), so the screen gates the affordances off with
    // an explanation. Same mechanism as exam-bank's `authoringEnabled`.
    writesEnabled: USE_MOCK,
    initialSchoolPage: result.ok ? result.value : null,
    initialErrorKey: result.ok ? null : result.error.type,
    fetchFeedPageAction,
    createPostAction,
    reactToPostAction,
    listCommentsAction,
    addCommentAction,
    togglePinAction,
    reportContentAction,
    removeContentAction,
  };

  return <FeedScreen {...vm} />;
}
