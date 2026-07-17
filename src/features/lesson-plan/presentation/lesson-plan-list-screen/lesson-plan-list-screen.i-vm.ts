import type {
  LessonPlanEntity,
  LessonPlanStatus,
} from "../../domain/entities/lesson-plan.entity";
import type {
  ListActionResult,
  ListScope,
  SubjectOption,
} from "../shared.i-vm";

/** Client-side filter state — narrows the already-fetched pages (spec §6). */
export interface LessonPlanFilterState {
  search: string;
  subjectId: string; // "" = all
  gradeLevel: string; // "" = all
  status: "" | LessonPlanStatus; // "" = all; only used in mine scope
}

/** Card view-model — the screen resolves all display strings/derivations. */
export interface LPCardVM {
  id: string;
  title: string;
  subjectName: string;
  gradeLevel: string;
  status: LessonPlanStatus;
  filledSectionsCount: number; // 0-4
  tags: string[];
  updatedAtDisplay: string;
  /** scope==='mine' OR own plan surfaced in browse. Drives action label. */
  isMine: boolean;
  /** Always the resolved `card.unknownOwner` string on browse cards (FR-007). */
  ownerLabel: string;
  openPath: string;
}

/** Redirect notice surfaced on the list after a gated single-GET (FR-008). */
export type ListNotice = "access-denied" | "not-found" | null;

export interface LessonPlanListScreenVM {
  /** First page — scope='mine' (default), seeded by the RSC. null = load failed. */
  initialMinePage: {
    items: LessonPlanEntity[];
    nextCursor?: string;
    hasMore: boolean;
  } | null;
  subjects: SubjectOption[];
  gradeOptions: string[];
  currentTeacherId: string;
  /** RSC-computed create-route path (presentation never concatenates locale/tenant). */
  createPath: string;
  /** RSC-computed prefix; the client builds `${planPathPrefix}/${id}/edit`. */
  planPathPrefix: string;
  /** Redirect notice from a gated edit-route GET (AC-008.3/.4). */
  notice: ListNotice;
  listMineAction: (cursor?: string) => Promise<ListActionResult>;
  listBySubjectAction: (
    subjectId: string,
    opts?: { tag?: string; cursor?: string },
  ) => Promise<ListActionResult>;
}

export type { ListScope, SubjectOption };
