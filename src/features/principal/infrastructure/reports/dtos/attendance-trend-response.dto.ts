/** INT-003 wire shape. Response envelope payload: `{ weeks: [...] }`. */
export interface AttendanceTrendPointResponseDto {
  weekLabel: string;
  rate: number;
}

export interface AttendanceTrendResponseDto {
  weeks: AttendanceTrendPointResponseDto[];
}
