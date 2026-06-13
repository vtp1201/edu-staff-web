import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { ClassSubject } from "../../../domain/entities/class-subject.entity";
import type {
  CreateSubjectInput,
  PatchSubjectInput,
  Subject,
} from "../../../domain/entities/subject.entity";
import type {
  CreateParentInput,
  PatchParentInput,
  SubjectParent,
} from "../../../domain/entities/subject-parent.entity";
import type { SubjectCatalogueFailure } from "../../../domain/failures/subject-catalogue.failure";
import type { ISubjectCatalogueRepository } from "../../../domain/repositories/i-subject-catalogue.repository";
import { fail, ok, type Result } from "../../../domain/use-cases/result";
import {
  MOCK_CLASS_OFFERINGS,
  MOCK_PARENTS_WITH_SUBJECTS,
  type ParentWithSubjects,
} from "./fixtures";

const genId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

// Module-level mutable in-memory state (reset on each `new` for deterministic tests).
let _state: ParentWithSubjects[] = structuredClone(MOCK_PARENTS_WITH_SUBJECTS);

export class MockSubjectCatalogueRepository
  implements ISubjectCatalogueRepository
{
  constructor() {
    _state = structuredClone(MOCK_PARENTS_WITH_SUBJECTS);
  }

  private getParentById(id: string): ParentWithSubjects | undefined {
    return _state.find((p) => p.id === id);
  }

  private recalcCounts(parent: ParentWithSubjects) {
    parent.childCount = parent.subjects.length;
    parent.activeChildCount = parent.subjects.filter(
      (s) => s.status === "ACTIVE",
    ).length;
  }

  async listParents(): Promise<
    Result<SubjectParent[], SubjectCatalogueFailure>
  > {
    await mockDelay(150);
    return ok(_state.map(({ subjects: _subjects, ...p }) => p));
  }

  async createParent(
    data: CreateParentInput,
  ): Promise<Result<SubjectParent, SubjectCatalogueFailure>> {
    await mockDelay(200);
    const parent: ParentWithSubjects = {
      id: genId("sp"),
      name: data.name,
      conceptType: data.conceptType,
      conceptLabelCustom: data.conceptLabelCustom,
      status: "ACTIVE",
      childCount: 0,
      activeChildCount: 0,
      subjects: [],
    };
    _state.unshift(parent);
    const { subjects: _subjects, ...rest } = parent;
    return ok(rest);
  }

  async patchParent(
    id: string,
    data: PatchParentInput,
  ): Promise<Result<SubjectParent, SubjectCatalogueFailure>> {
    await mockDelay(200);
    const parent = this.getParentById(id);
    if (!parent) return fail({ type: "not-found" });
    if (data.name !== undefined) parent.name = data.name;
    if (data.conceptType !== undefined) parent.conceptType = data.conceptType;
    if (data.conceptLabelCustom !== undefined)
      parent.conceptLabelCustom = data.conceptLabelCustom;
    const { subjects: _subjects, ...rest } = parent;
    return ok(rest);
  }

  async archiveParent(
    id: string,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    await mockDelay(200);
    const parent = this.getParentById(id);
    if (!parent) return fail({ type: "not-found" });
    parent.status = "ARCHIVED";
    return ok(undefined);
  }

  async restoreParent(
    id: string,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    await mockDelay(200);
    const parent = this.getParentById(id);
    if (!parent) return fail({ type: "not-found" });
    parent.status = "ACTIVE";
    return ok(undefined);
  }

  async listSubjects(
    parentId: string,
  ): Promise<Result<Subject[], SubjectCatalogueFailure>> {
    await mockDelay(150);
    const parent = this.getParentById(parentId);
    if (!parent) return fail({ type: "not-found" });
    return ok([...parent.subjects]);
  }

  async createSubject(
    data: CreateSubjectInput,
  ): Promise<Result<Subject, SubjectCatalogueFailure>> {
    await mockDelay(200);
    const parent = this.getParentById(data.parentId);
    if (!parent) return fail({ type: "not-found" });
    const subject: Subject = {
      id: genId("sub"),
      parentId: data.parentId,
      name: data.name,
      code: data.code,
      gradeLevel: data.gradeLevel,
      status: "ACTIVE",
      inUse: false,
      periodCount: null,
      requiredAssessmentCount: null,
      outcomeTargets: "",
      masterSyllabus: "",
      exerciseBankRef: "",
      examBankRef: "",
    };
    parent.subjects.push(subject);
    this.recalcCounts(parent);
    return ok({ ...subject });
  }

  async getSubject(
    id: string,
  ): Promise<
    Result<
      { subject: Subject; classOfferings: ClassSubject[] },
      SubjectCatalogueFailure
    >
  > {
    await mockDelay(150);
    for (const parent of _state) {
      const subject = parent.subjects.find((s) => s.id === id);
      if (subject) {
        const classOfferings = MOCK_CLASS_OFFERINGS[id] ?? [];
        return ok({ subject: { ...subject }, classOfferings });
      }
    }
    return fail({ type: "not-found" });
  }

  async patchSubject(
    id: string,
    data: PatchSubjectInput,
  ): Promise<Result<Subject, SubjectCatalogueFailure>> {
    await mockDelay(200);
    for (const parent of _state) {
      const idx = parent.subjects.findIndex((s) => s.id === id);
      if (idx !== -1) {
        parent.subjects[idx] = { ...parent.subjects[idx], ...data };
        this.recalcCounts(parent);
        return ok({ ...parent.subjects[idx] });
      }
    }
    return fail({ type: "not-found" });
  }

  async archiveSubject(
    id: string,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    await mockDelay(200);
    for (const parent of _state) {
      const subject = parent.subjects.find((s) => s.id === id);
      if (subject) {
        subject.status = "ARCHIVED";
        this.recalcCounts(parent);
        return ok(undefined);
      }
    }
    return fail({ type: "not-found" });
  }
}
