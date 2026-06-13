import "server-only";
import type { AxiosInstance } from "axios";
import {
  classStudentsPath,
  ROSTER_EP,
  transferPath,
  unenrollPath,
} from "@/bootstrap/endpoint/admin-roster.endpoint";
import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { SearchStudent } from "../../domain/entities/search-student.entity";
import type {
  IRosterRepository,
  Result,
  VoidResult,
} from "../../domain/repositories/i-roster.repository";
import type { ClassesResponseDto } from "../dtos/classes-response.dto";
import type { RosterResponseDto } from "../dtos/roster-response.dto";
import type { SearchStudentsResponseDto } from "../dtos/search-students-response.dto";
import {
  toClassSummary,
  toRosterStudent,
  toSearchStudent,
} from "../mappers/roster.mapper";
import { toRosterFailure } from "../mappers/roster-failure.mapper";

export class RosterRepository implements IRosterRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getClasses(params: {
    yearId?: string;
  }): Promise<Result<ClassSummary[]>> {
    try {
      const data = (await this.http.get(ROSTER_EP.classes, {
        params: params.yearId ? { yearId: params.yearId } : undefined,
      })) as unknown as ClassesResponseDto;
      return { ok: true, data: data.map(toClassSummary) };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async getClassRoster(classId: string): Promise<Result<RosterStudent[]>> {
    try {
      const data = (await this.http.get(
        classStudentsPath(classId),
      )) as unknown as RosterResponseDto;
      return { ok: true, data: data.map(toRosterStudent) };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async getSearchPool(classId: string): Promise<Result<SearchStudent[]>> {
    try {
      const data = (await this.http.get(ROSTER_EP.searchPool, {
        params: { excludeClassId: classId },
      })) as unknown as SearchStudentsResponseDto;
      return { ok: true, data: data.map(toSearchStudent) };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async enrollStudent(classId: string, studentId: string): Promise<VoidResult> {
    try {
      await this.http.post(classStudentsPath(classId), { studentId });
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async unenrollStudent(
    classId: string,
    studentId: string,
  ): Promise<VoidResult> {
    try {
      await this.http.delete(unenrollPath(classId, studentId));
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async unenrollStudents(
    classId: string,
    studentIds: string[],
  ): Promise<VoidResult> {
    try {
      await Promise.all(
        studentIds.map((id) => this.http.delete(unenrollPath(classId, id))),
      );
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }

  async transferStudent(
    studentId: string,
    fromClassId: string,
    toClassId: string,
  ): Promise<VoidResult> {
    try {
      await this.http.post(transferPath(studentId), { fromClassId, toClassId });
      return { ok: true, data: undefined };
    } catch (err) {
      return { ok: false, error: toRosterFailure(err) };
    }
  }
}
