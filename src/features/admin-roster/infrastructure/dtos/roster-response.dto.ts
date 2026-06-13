export interface RosterStudentDto {
  id: string;
  name: string;
  dob: string;
  gender: string;
  status: string;
}

export type RosterResponseDto = RosterStudentDto[];
