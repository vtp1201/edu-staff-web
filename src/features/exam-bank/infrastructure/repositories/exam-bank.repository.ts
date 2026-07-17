import "server-only";
import type { AxiosInstance } from "axios";
import { EXAM_BANK_EP } from "@/bootstrap/endpoint/exam-bank.endpoint";
import { SUBJECT_CATALOGUE_EP } from "@/bootstrap/endpoint/subject-catalogue.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import type { ExamBankFilter } from "../../domain/entities/exam-bank-filter.entity";
import type {
  CreateExamInput,
  UpdateExamInput,
} from "../../domain/entities/exam-bank-input.entity";
import type {
  ExamBankStatus,
  ExamBankSummary,
} from "../../domain/entities/exam-bank-summary.entity";
import type { IExamBankRepository } from "../../domain/repositories/i-exam-bank.repository";
import type { ExamBankDetailResponseDto } from "../dtos/exam-bank-detail-response.dto";
import type {
  ExamBankListResponseDto,
  ExamBankSummaryDto,
  WireExamStatus,
} from "../dtos/exam-bank-list-response.dto";
import {
  mapExamBankDetail,
  mapExamBankSummary,
} from "../mappers/exam-bank.mapper";
import { mapExamBankApiError } from "./map-exam-bank-error";

/** Minimal view of `SubjectResponse` — only the fields the name fan-out needs. */
interface SubjectNameDto {
  subjectId: string;
  name: string;
}

/** Domain status → wire status, for the list `status` query filter. */
const WIRE_STATUS: Record<ExamBankStatus, WireExamStatus> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  confidential: "CONFIDENTIAL",
};

/**
 * Real `/lms/exam-papers` repository (Option A — US-E18.15/ADR 0056).
 *
 * Wired REAL: `listExamBank` / `getExamDetail` / `publishExam`. The write path
 * (`createExam`/`updateExam`/`deleteExam`) has NO wire equivalent — the real
 * contract exposes no metadata-update, no question-replace/edit/delete, and no
 * DELETE endpoint — so those are permanently blocked stubs (throw "not-supported").
 * The teacher builder + delete affordance are hidden/blocked in real mode.
 *
 * `subjectName` (absent on the wire) is resolved via a `subject-catalogue`
 * fan-out; `teacherName`/`maxAttempts`/`difficulty`/question `options` have no
 * wire source (see mapper). Errors map by `code` via `mapExamBankApiError`, then
 * throw the failure key (throwing-repo idiom → domain `mapRepoError`).
 */
export class ExamBankRepository implements IExamBankRepository {
  constructor(private readonly http: AxiosInstance) {}

  // --- subject-name fan-out (the wire carries only subjectId) ---

  /** Fully page through `GET /subjects` → subjectId → name. Never throws. */
  private async fetchSubjectNames(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    try {
      let cursor: string | undefined;
      do {
        const env = (await this.http.get(SUBJECT_CATALOGUE_EP.subjects, {
          params: { ...(cursor ? { cursor } : {}) },
          raw: true,
        })) as unknown as ApiEnvelope<SubjectNameDto[]>;
        const { data, pagination } = parseEnvelope(env);
        for (const s of data) map.set(s.subjectId, s.name);
        cursor =
          pagination?.hasMore && pagination.nextCursor
            ? pagination.nextCursor
            : undefined;
      } while (cursor);
    } catch {
      // Name resolution is best-effort — fall back to the id in the mapper.
    }
    return map;
  }

  /** Single subject name; falls back to the id on any error. */
  private async fetchSubjectName(subjectId: string): Promise<string> {
    try {
      const dto = (await this.http.get(
        SUBJECT_CATALOGUE_EP.subject(subjectId),
      )) as unknown as SubjectNameDto;
      return dto.name || subjectId;
    } catch {
      return subjectId;
    }
  }

  // --- wired REAL ---

  async listExamBank(filter: ExamBankFilter): Promise<ExamBankSummary[]> {
    try {
      // Wire query keys: `subjectId`, `status` (UPPER), `gradeLevel` (unused —
      // ExamBankFilter has no grade). `search`/`teacherId` are client-side.
      const baseParams: Record<string, string> = {};
      if (filter.subjectId) baseParams.subjectId = filter.subjectId;
      if (filter.status) baseParams.status = WIRE_STATUS[filter.status];

      const papers: ExamBankSummaryDto[] = [];
      let cursor: string | undefined;
      do {
        // `raw: true` MUST be a top-level sibling of `params` — nesting it inside
        // `params` silently skips envelope-parse (epic bug class US-E18.2/19).
        const env = (await this.http.get(EXAM_BANK_EP.list, {
          params: { ...baseParams, ...(cursor ? { cursor } : {}) },
          raw: true,
        })) as unknown as ApiEnvelope<ExamBankListResponseDto>;
        const { data, pagination } = parseEnvelope(env);
        papers.push(...data.items);
        cursor =
          pagination?.hasMore && pagination.nextCursor
            ? pagination.nextCursor
            : undefined;
      } while (cursor);

      const names = await this.fetchSubjectNames();
      return papers.map((p) =>
        mapExamBankSummary(p, names.get(p.subjectId) ?? p.subjectId),
      );
    } catch (err) {
      throw new Error(mapExamBankApiError(err));
    }
  }

  async getExamDetail(id: string): Promise<ExamBankDetail> {
    try {
      const dto = (await this.http.get(
        EXAM_BANK_EP.detail(id),
      )) as unknown as ExamBankDetailResponseDto;
      const subjectName = await this.fetchSubjectName(dto.subjectId);
      return mapExamBankDetail(dto, subjectName);
    } catch (err) {
      throw new Error(mapExamBankApiError(err));
    }
  }

  async publishExam(id: string): Promise<ExamBankSummary> {
    try {
      // DRAFT→PUBLISHED transition (matches the existing "Publish" UI action).
      const dto = (await this.http.put(EXAM_BANK_EP.status(id), {
        status: "PUBLISHED",
      })) as unknown as ExamBankSummaryDto;
      const subjectName = await this.fetchSubjectName(dto.subjectId);
      return mapExamBankSummary(dto, subjectName);
    } catch (err) {
      throw new Error(mapExamBankApiError(err));
    }
  }

  // --- permanently blocked stubs (no wire endpoint — US-E18.15/ADR 0056) ---
  // `create` accepts metadata only + append-one-question (DRAFT-only, no options
  // field); there is no metadata-update, no question-replace/edit/delete, and no
  // DELETE. The builder + delete affordance are hidden/blocked in real mode, so
  // these throw defensively rather than issue a request that can't round-trip.

  async createExam(_input: CreateExamInput): Promise<ExamBankDetail> {
    throw new Error("not-supported");
  }

  async updateExam(
    _id: string,
    _input: UpdateExamInput,
  ): Promise<ExamBankDetail> {
    throw new Error("not-supported");
  }

  async deleteExam(_id: string): Promise<void> {
    throw new Error("not-supported");
  }
}
