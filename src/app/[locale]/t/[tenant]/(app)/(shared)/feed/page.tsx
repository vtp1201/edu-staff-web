import { requireRole } from "@/bootstrap/auth-guard/require-role.server";
import { makeListFeedUseCase } from "@/bootstrap/di/feed.di";
import type { FeedRole } from "@/features/feed/domain/entities/feed-post.entity";
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
  togglePinMockAction,
} from "./actions";

/** BE/guard role → feed role. `admin` moderates like a principal (full menu). */
function toFeedRole(role: string): FeedRole {
  switch (role) {
    case "principal":
    case "admin":
      return "principal";
    case "student":
      return "student";
    case "parent":
      return "parent";
    default:
      return "teacher";
  }
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
  const role = toFeedRole(guard.ok ? guard.role : "student");
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
    initialSchoolPage: result.ok ? result.value : null,
    initialErrorKey: result.ok ? null : result.error.type,
    fetchFeedPageAction,
    createPostAction,
    reactToPostAction,
    listCommentsAction,
    addCommentAction,
    togglePinMockAction,
    reportContentAction,
    removeContentAction,
  };

  return <FeedScreen {...vm} />;
}
