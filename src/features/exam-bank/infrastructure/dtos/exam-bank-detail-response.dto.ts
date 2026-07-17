import type { ExamBankSummaryDto } from "./exam-bank-list-response.dto";

/**
 * The single-get response is the same `ExamPaperResponse` shape as a list item
 * (it always carries the full `questions` array). Aliased for call-site clarity.
 */
export type ExamBankDetailResponseDto = ExamBankSummaryDto;
