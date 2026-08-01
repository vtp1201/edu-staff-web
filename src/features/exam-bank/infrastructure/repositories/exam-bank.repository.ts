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
  mapQuestionToWire,
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
 * Real `/courseware/exam-papers` repository (US-E18.15/ADR 0056, write path
 * extended by US-E18.28 after core US-152).
 *
 * Wired REAL: `listExamBank` / `getExamDetail` / `publishExam` / `updateExam`
 * (paper metadata + a question-level diff-sync) / `deleteExam`. `createExam`
 * remains a blocked stub — `POST /exam-papers` is still metadata-only, with no
 * way to carry the builder's questions, so the create route stays blocked in
 * real mode.
 *
 * `subjectName` (absent on the wire) is resolved via a `subject-catalogue`
 * fan-out; `teacherName`/`maxAttempts` still have no wire source (see mapper).
 * Errors map by `code` via `mapExamBankApiError`, then throw the failure key
 * (throwing-repo idiom → domain `mapRepoError`).
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

  /**
   * Diff-sync the paper against the server (US-E18.28/ADR 0056 Amendment 2).
   * No bulk/replace endpoint exists, so this composes the per-op routes:
   *
   *   GET current → PATCH metadata (skipped when unchanged) → DELETE removed
   *   questions → PUT existing ones → POST new ones → GET authoritative state.
   *
   * Deletes run first so the server's position renumbering settles before the
   * edits/adds (which address questions by id anyway). Local questions whose
   * `id` matches a server `questionId` are edits; the rest carry a client-local
   * temp id from the builder and are appends.
   *
   * NOT atomic — the underlying contract has no transaction spanning these
   * calls. A mid-sequence failure leaves the earlier calls persisted and
   * surfaces normally; the next load shows the true partial state. No rollback
   * is attempted (would need compensating writes that can fail in turn).
   */
  async updateExam(
    id: string,
    input: UpdateExamInput,
  ): Promise<ExamBankDetail> {
    try {
      const current = (await this.http.get(
        EXAM_BANK_EP.detail(id),
      )) as unknown as ExamBankDetailResponseDto;

      // Metadata: only `title`/`durationMinutes` are modelled client-side.
      // `gradeLevel` is omitted (unmodelled — the wire leaves omitted fields
      // unchanged) and `subjectId` is immutable server-side. Skip a no-op write.
      if (
        current.title !== input.title ||
        current.durationMinutes !== input.durationMinutes
      ) {
        await this.http.patch(EXAM_BANK_EP.detail(id), {
          title: input.title,
          durationMinutes: input.durationMinutes,
        });
      }

      const serverIds = new Set(current.questions.map((q) => q.questionId));
      const localIds = new Set(input.questions.map((q) => q.id));

      for (const q of current.questions) {
        if (!localIds.has(q.questionId)) {
          await this.http.delete(EXAM_BANK_EP.question(id, q.questionId));
        }
      }
      for (const q of input.questions) {
        if (serverIds.has(q.id)) {
          // Unconditional replace — an idempotent no-op PUT is safer than a
          // content-diff that could go stale (ADR 0056 Amendment 2).
          await this.http.put(
            EXAM_BANK_EP.question(id, q.id),
            mapQuestionToWire(q),
          );
        }
      }
      for (const q of input.questions) {
        if (!serverIds.has(q.id)) {
          await this.http.post(
            EXAM_BANK_EP.questions(id),
            mapQuestionToWire(q),
          );
        }
      }

      // Positions renumber and `totalMarks` recomputes server-side → re-read.
      const final = (await this.http.get(
        EXAM_BANK_EP.detail(id),
      )) as unknown as ExamBankDetailResponseDto;
      return mapExamBankDetail(
        final,
        await this.fetchSubjectName(final.subjectId),
      );
    } catch (err) {
      throw new Error(mapExamBankApiError(err));
    }
  }

  /** Hard-delete a DRAFT paper the caller authors → 204, no body. */
  async deleteExam(id: string): Promise<void> {
    try {
      await this.http.delete(EXAM_BANK_EP.detail(id));
    } catch (err) {
      throw new Error(mapExamBankApiError(err));
    }
  }

  // --- still a blocked stub (no wire endpoint — ADR 0056 Amendment 2) ---
  // `POST /exam-papers` remains metadata-only: there is no bulk/inline-questions
  // create, so authoring a paper from scratch cannot round-trip in one call. The
  // create route renders `ExamBuilderUnavailable` in real mode; this throws
  // defensively rather than issue a request that would drop every question.

  async createExam(_input: CreateExamInput): Promise<ExamBankDetail> {
    throw new Error("not-supported");
  }
}
