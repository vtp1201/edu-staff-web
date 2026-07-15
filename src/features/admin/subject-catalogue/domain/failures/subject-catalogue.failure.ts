/** Typed error union for subject-catalogue operations.
 *  Keys mirror subjectCatalogue.errors.* i18n leaves (TR-026, US-E06.6). */
export type SubjectCatalogueFailure =
  | { type: "code-format" }
  | { type: "archive-blocked-parent" }
  | { type: "archive-blocked-subject" }
  | { type: "subject-archived" }
  | { type: "already-exists" }
  | { type: "parent-in-use" }
  | { type: "parent-archived" }
  | { type: "parent-forbidden" }
  | { type: "grade-level-out-of-range" }
  | { type: "parent-not-active" }
  | { type: "class-subject-already-exists" }
  | { type: "class-subject-locked-field-update" }
  | { type: "class-subject-in-use" }
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "network-error" }
  | { type: "unknown" };
