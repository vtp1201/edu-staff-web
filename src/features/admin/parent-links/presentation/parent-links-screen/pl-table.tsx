import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLConsentBadge } from "./pl-consent-badge";
import { PLPersonCell } from "./pl-person-cell";
import { PLRelationBadge } from "./pl-relation-badge";
import { PLRowMenu } from "./pl-row-menu";
import type { PLRowsProps } from "./pl-rows.i-vm";

/** Desktop table (≥760px). Consumes the SAME `PLRowsProps` as PLCardList. */
export function PLTable({
  rows,
  labels,
  onViewDetail,
  onUnlinkRequest,
}: PLRowsProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.columns.student}</TableHead>
              <TableHead>{labels.columns.parent}</TableHead>
              <TableHead>{labels.columns.relationship}</TableHead>
              <TableHead>{labels.columns.consent}</TableHead>
              <TableHead>{labels.columns.linkedOn}</TableHead>
              <TableHead className="text-right">
                {labels.columns.actions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.linkId}>
                <TableCell>
                  <PLPersonCell
                    fullName={row.student.fullName}
                    sub={labels.studentClassPrefix(row.student.className)}
                    avatarUrl={row.student.avatarUrl}
                  />
                </TableCell>
                <TableCell>
                  <PLPersonCell
                    fullName={row.parent.fullName}
                    sub={row.parent.phone}
                    avatarUrl={row.parent.avatarUrl}
                  />
                </TableCell>
                <TableCell>
                  <PLRelationBadge
                    relationship={row.relationship}
                    label={row.relationshipLabel}
                  />
                </TableCell>
                <TableCell>
                  <PLConsentBadge
                    status={row.consentStatus}
                    label={row.consentLabel}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-sm tabular-nums">
                  {row.linkedOnLabel}
                </TableCell>
                <TableCell className="text-right">
                  <PLRowMenu
                    viewDetailLabel={labels.viewDetailLabel}
                    unlinkLabel={labels.unlinkLabel}
                    triggerAriaLabel={labels.rowMenuAriaLabelOf(
                      row.student.fullName,
                      row.parent.fullName,
                    )}
                    canViewDetail={row.actions.viewDetail}
                    canUnlink={row.actions.unlink}
                    onViewDetail={() => onViewDetail(row.linkId)}
                    onUnlinkRequest={() => onUnlinkRequest(row)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
