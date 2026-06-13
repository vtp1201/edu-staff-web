/** A student enrolled in a class roster. */
export interface RosterStudent {
  id: string;
  name: string;
  /** Date of birth, display string dd/MM/yyyy. */
  dob: string;
  gender: "F" | "M";
  status: "active" | "transferred";
}
