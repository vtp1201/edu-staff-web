import type { ClassHubTab } from "@/features/teacher/domain/class-hub-tabs";
import type {
  ClassRole,
  TeacherClassSubject,
} from "@/features/teacher/domain/entities/teacher-class.entity";

/**
 * Raw, untranslated identity fields (US-E24.8). `className` is the bare class
 * name ("10A1"); the "Lớp " prefix is i18n copy composed by the header, matching
 * the `teacherClasses.card.studentCount` convention.
 */
export interface ClassHubHeaderVm {
  classId: string;
  className: string;
  /** Homeroom first — badge order follows this array. */
  roles: ClassRole[];
  /** Same shape `RoleBadges` accepts — no adapter needed. */
  subjects: TeacherClassSubject[];
  studentCount: number;
  /** e.g. "2025–2026". */
  academicYearLabel: string;
  /** Absolute breadcrumb target (the teacher's class list). */
  classesHref: string;
}

/** One tab, already visibility-filtered and href-built by the RSC page. */
export interface ClassHubTabVm {
  id: ClassHubTab;
  href: string;
}

export interface ClassHubTabsVm {
  activeTab: ClassHubTab;
  tabs: ClassHubTabVm[];
}
