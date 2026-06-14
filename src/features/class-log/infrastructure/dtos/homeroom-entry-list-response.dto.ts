import type { HomeroomEntryResponseDto } from "./homeroom-entry-response.dto";

/** List payload (envelope `data`) for `GET .../homeroom-entries`. */
export interface HomeroomEntryListResponseDto {
  entries: HomeroomEntryResponseDto[];
}
