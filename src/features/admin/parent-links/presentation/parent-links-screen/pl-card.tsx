import { Link2 } from "lucide-react";
import type { ParentLinkRowVM } from "./parent-links-screen.i-vm";
import { PLConsentBadge } from "./pl-consent-badge";
import { PLPersonCell } from "./pl-person-cell";
import { PLRowMenu } from "./pl-row-menu";
import type { PLRowsLabels } from "./pl-rows.i-vm";

export interface PLCardProps {
  row: ParentLinkRowVM;
  labels: PLRowsLabels;
  onViewDetail: (linkId: string) => void;
  onUnlinkRequest: (row: ParentLinkRowVM) => void;
}

/** One link as a stacked card (<760px). Full data parity with a table row
 * (UC-007) — reuses the same person cell / badges / row menu. */
export function PLCard({
  row,
  labels,
  onViewDetail,
  onUnlinkRequest,
}: PLCardProps) {
  return (
    <div className="border-border border-b px-4 py-3.5 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <PLPersonCell
            fullName={row.student.fullName}
            sub={labels.studentClassPrefix(row.student.className)}
            avatarUrl={row.student.avatarUrl}
          />
          <div className="flex items-center gap-1.5 pl-1 text-muted-foreground">
            <Link2 className="size-3" aria-hidden="true" />
            <span className="font-bold text-xs">{row.relationshipLabel}</span>
          </div>
          <PLPersonCell
            fullName={row.parent.fullName}
            sub={row.parent.phone}
            avatarUrl={row.parent.avatarUrl}
          />
        </div>
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
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PLConsentBadge status={row.consentStatus} label={row.consentLabel} />
        <span className="text-muted-foreground text-xs">
          {labels.linkedOnPrefix} {row.linkedOnLabel}
        </span>
      </div>
    </div>
  );
}
