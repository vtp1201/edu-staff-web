import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PdfPreviewProps {
  title: string;
  pageCountLabel: string;
  downloadHref: string;
  labels: { downloadButton: string; downloadAriaLabel: string };
}

/** PDF lesson: preview placeholder + download link. */
export function PdfPreview({
  title,
  pageCountLabel,
  downloadHref,
  labels,
}: PdfPreviewProps) {
  return (
    <div className="bg-edu-bg px-5 py-12 text-center">
      <div className="mb-3.5 inline-flex size-[72px] items-center justify-center rounded-2xl bg-edu-error/15">
        <FileText
          className="size-9 text-edu-error"
          strokeWidth={1.6}
          aria-hidden="true"
        />
      </div>
      <p className="font-bold text-foreground text-sm">{title}</p>
      <p className="mt-1 text-edu-text-secondary text-xs">
        PDF · {pageCountLabel}
      </p>
      <Button asChild className="mt-4">
        <a href={downloadHref} download aria-label={labels.downloadAriaLabel}>
          <Download className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
          {labels.downloadButton}
        </a>
      </Button>
    </div>
  );
}
