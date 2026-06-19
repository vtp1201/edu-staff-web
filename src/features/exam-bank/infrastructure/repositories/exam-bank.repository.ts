import "server-only";
import type { AxiosInstance } from "axios";
import { EXAM_BANK_EP } from "@/bootstrap/endpoint/exam-bank.endpoint";
import type { ExamBankDetail } from "../../domain/entities/exam-bank-detail.entity";
import type { ExamBankFilter } from "../../domain/entities/exam-bank-filter.entity";
import type {
  CreateExamInput,
  UpdateExamInput,
} from "../../domain/entities/exam-bank-input.entity";
import type { ExamBankSummary } from "../../domain/entities/exam-bank-summary.entity";
import type { IExamBankRepository } from "../../domain/repositories/i-exam-bank.repository";
import type { ExamBankDetailResponseDto } from "../dtos/exam-bank-detail-response.dto";
import type {
  ExamBankListResponseDto,
  ExamBankSummaryDto,
} from "../dtos/exam-bank-list-response.dto";
import {
  mapExamBankDetail,
  mapExamBankSummary,
} from "../mappers/exam-bank.mapper";

export class ExamBankRepository implements IExamBankRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listExamBank(filter: ExamBankFilter): Promise<ExamBankSummary[]> {
    const dto = (await this.http.get(EXAM_BANK_EP.list, {
      params: {
        status: filter.status,
        subjectId: filter.subjectId,
        teacherId: filter.teacherId,
        search: filter.search,
      },
    })) as unknown as ExamBankListResponseDto;
    return dto.items.map(mapExamBankSummary);
  }

  async getExamDetail(id: string): Promise<ExamBankDetail> {
    const dto = (await this.http.get(
      EXAM_BANK_EP.detail(id),
    )) as unknown as ExamBankDetailResponseDto;
    return mapExamBankDetail(dto);
  }

  async createExam(input: CreateExamInput): Promise<ExamBankDetail> {
    const dto = (await this.http.post(
      EXAM_BANK_EP.create,
      input,
    )) as unknown as ExamBankDetailResponseDto;
    return mapExamBankDetail(dto);
  }

  async updateExam(
    id: string,
    input: UpdateExamInput,
  ): Promise<ExamBankDetail> {
    const dto = (await this.http.put(
      EXAM_BANK_EP.update(id),
      input,
    )) as unknown as ExamBankDetailResponseDto;
    return mapExamBankDetail(dto);
  }

  async publishExam(id: string): Promise<ExamBankSummary> {
    const dto = (await this.http.post(
      EXAM_BANK_EP.publish(id),
      {},
    )) as unknown as ExamBankSummaryDto;
    return mapExamBankSummary(dto);
  }

  async deleteExam(id: string): Promise<void> {
    await this.http.delete(EXAM_BANK_EP.delete(id));
  }
}
