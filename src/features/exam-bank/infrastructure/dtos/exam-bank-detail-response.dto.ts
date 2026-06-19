import type { ExamBankSummaryDto } from "./exam-bank-list-response.dto";
import type { ExamBankQuestionDto } from "./exam-bank-question-response.dto";

export interface ExamBankDetailResponseDto extends ExamBankSummaryDto {
  questions: ExamBankQuestionDto[];
}
