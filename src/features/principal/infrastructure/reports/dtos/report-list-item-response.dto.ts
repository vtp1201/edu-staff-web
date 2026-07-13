/** INT-004/INT-005 wire shape (camelCase). */
export interface ReportListItemResponseDto {
  id: string;
  name: string;
  term: "HK1" | "HK2" | "FULL_YEAR";
  createdAt: string;
  status: "ready" | "generating";
}
