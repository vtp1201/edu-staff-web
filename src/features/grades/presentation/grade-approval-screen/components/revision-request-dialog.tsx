"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MIN_REVISION_NOTE_LENGTH } from "@/features/grades/domain/use-cases/request-grade-revision.use-case";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (note: string) => void;
};

export function RevisionRequestDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: Props) {
  const t = useTranslations("gradeApproval.revisionDialog");
  const noteId = useId();
  const errId = useId();
  const [note, setNote] = useState("");
  const [showError, setShowError] = useState(false);

  const invalid = note.trim().length < MIN_REVISION_NOTE_LENGTH;

  const handleConfirm = () => {
    if (invalid) {
      setShowError(true);
      return;
    }
    onConfirm(note);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setNote("");
      setShowError(false);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={noteId}>{t("noteLabel")}</Label>
          <Textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={4}
            aria-invalid={showError && invalid}
            aria-describedby={showError && invalid ? errId : undefined}
          />
          {showError && invalid ? (
            <p id={errId} className="text-edu-error-text text-xs">
              {t("noteMinLength")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
