import type { Department } from "../../domain/entities/department.entity";
import type { PositionAssignment } from "../../domain/entities/position-assignment.entity";
import type { PositionTitle } from "../../domain/entities/position-title.entity";
import type { StaffingAssignmentsScreenProps } from "../staffing-assignments-screen/staffing-assignments-screen.i-vm";
import type { StaffingDepartmentsScreenProps } from "../staffing-departments-screen/staffing-departments-screen.i-vm";
import type { StaffingPositionTitlesScreenProps } from "../staffing-position-titles-screen/staffing-position-titles-screen.i-vm";

export interface StaffingScreenProps {
  initialDepartments: Department[];
  initialPositionTitles: PositionTitle[];
  initialAssignments: PositionAssignment[];
  isAdmin: boolean;

  // Departments actions
  onCreateDepartment: StaffingDepartmentsScreenProps["onCreateDepartment"];
  onPatchDepartment: StaffingDepartmentsScreenProps["onPatchDepartment"];
  onArchiveDepartment: StaffingDepartmentsScreenProps["onArchiveDepartment"];

  // Position-title actions
  onCreatePositionTitle: StaffingPositionTitlesScreenProps["onCreatePositionTitle"];
  onPatchPositionTitle: StaffingPositionTitlesScreenProps["onPatchPositionTitle"];
  onArchivePositionTitle: StaffingPositionTitlesScreenProps["onArchivePositionTitle"];

  // Assignment actions
  onAssignPosition: StaffingAssignmentsScreenProps["onAssignPosition"];
  onRevokeAssignment: StaffingAssignmentsScreenProps["onRevokeAssignment"];
  onCopyAssignments: StaffingAssignmentsScreenProps["onCopyAssignments"];
}
