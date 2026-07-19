import type { ParentLinkRowVM } from "./parent-links-screen.i-vm";

/** Already-translated labels shared by the table + card list (one source). */
export interface PLRowsLabels {
  columns: {
    student: string;
    parent: string;
    relationship: string;
    consent: string;
    linkedOn: string;
    actions: string;
  };
  studentClassPrefix: (className: string) => string;
  linkedOnPrefix: string;
  viewDetailLabel: string;
  unlinkLabel: string;
  rowMenuAriaLabelOf: (studentName: string, parentName: string) => string;
}

/** The IDENTICAL row-facing prop shape both PLTable and PLCardList accept. */
export interface PLRowsProps {
  rows: ParentLinkRowVM[];
  labels: PLRowsLabels;
  onViewDetail: (linkId: string) => void;
  onUnlinkRequest: (row: ParentLinkRowVM) => void;
}
