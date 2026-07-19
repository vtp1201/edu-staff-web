import type { LinkCandidate } from "../../domain/entities/link-candidate.entity";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";
import type {
  ConsentStatus,
  ParentStudentLink,
  RelationshipType,
} from "../../domain/entities/parent-student-link.entity";
import type { ParentStudentLinkFailure } from "../../domain/failures/parent-student-link.failure";

/**
 * Server-Action result shape (US-E20.1). `retryable` is threaded so the client
 * query/mutation retry predicate can honour the failure union's transient flag
 * (state-architecture §7). `fields` carries create's 422 per-field errors.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: ParentStudentLinkFailure["type"];
      retryable: boolean;
      fields?: { field: string; message: string }[];
    };

export interface ParentLinksPage {
  items: ParentStudentLink[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ParentLinksFilter {
  q: string;
  classId: string | null;
}

export interface ClassOption {
  id: string;
  label: string;
}

export interface CreateLinkActionInput {
  studentId: string;
  parentId: string;
  relationship: RelationshipType;
  note?: string;
}

/**
 * Screen-level ViewModel — the server↔client contract. RSC `page.tsx` seeds
 * `initialFilter`/`initialPage`/`initialErrorKey` from the URL + first
 * `listLinksAction` call; the client container re-fetches on filter/cursor
 * change via the same action ref (state-architecture §3).
 */
export interface ParentLinksScreenProps {
  initialFilter: ParentLinksFilter;
  initialPage: ParentLinksPage;
  /** Set only when the RSC's own first fetch failed — seeds the query error
   * state; never silently coerced to an empty-page render. */
  initialErrorKey?: ParentStudentLinkFailure["type"];
  classOptions: ClassOption[];

  listLinksAction: (
    filter: ParentLinksFilter,
    cursor: string | null,
  ) => Promise<ActionResult<ParentLinksPage>>;
  createLinkAction: (
    input: CreateLinkActionInput,
  ) => Promise<ActionResult<ParentStudentLink>>;
  unlinkLinkAction: (linkId: string) => Promise<ActionResult<undefined>>;
  getLinkConsentDetailAction: (
    studentId: string,
    parentId: string,
  ) => Promise<ActionResult<ParentStudentConsent>>;
  searchStudentCandidatesAction: (
    q: string,
    classId?: string,
  ) => Promise<ActionResult<LinkCandidate[]>>;
  searchParentCandidatesAction: (
    q: string,
  ) => Promise<ActionResult<LinkCandidate[]>>;
}

/** Row-level view-model — the ONLY shape both PLTable and PLCardList accept. */
export interface ParentLinkRowVM {
  linkId: string;
  student: {
    memberId: string;
    fullName: string;
    avatarUrl?: string;
    className: string;
  };
  parent: {
    memberId: string;
    fullName: string;
    avatarUrl?: string;
    phone: string;
  };
  relationship: RelationshipType;
  relationshipLabel: string;
  consentStatus: ConsentStatus;
  consentLabel: string;
  note?: string;
  /** Pre-formatted, e.g. "12/08/2025". */
  linkedOnLabel: string;
  actions: { viewDetail: boolean; unlink: boolean };
}

/** Minimal slice captured at open time for the unlink dialog's copy + retry. */
export interface UnlinkTarget {
  linkId: string;
  studentId: string;
  parentId: string;
  parentName: string;
  studentName: string;
  className: string;
}
