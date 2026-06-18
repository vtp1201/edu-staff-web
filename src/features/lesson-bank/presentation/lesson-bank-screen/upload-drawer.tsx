"use client";

import { Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import type {
  LessonFileType,
  LessonVisibility,
} from "../../domain/entities/lesson.entity";
import type { UploadLessonInput } from "../../domain/entities/upload-lesson-input.entity";
import type { SubjectOption } from "./lesson-bank-screen.i-vm";

type UploadDrawerProps = {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
  departments: string[];
  onSubmit: (input: UploadLessonInput) => Promise<void>;
  isSubmitting: boolean;
};

const FILE_TYPES: LessonFileType[] = ["pdf", "pptx", "mp4", "link"];
const VISIBILITY_OPTIONS: LessonVisibility[] = ["private", "dept", "school"];

export function UploadDrawer({
  open,
  onClose,
  subjects,
  departments,
  onSubmit,
  isSubmitting,
}: UploadDrawerProps) {
  const t = useTranslations("lessonBank");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [department, setDepartment] = useState("");
  const [fileType, setFileType] = useState<LessonFileType | "">("");
  const [linkUrl, setLinkUrl] = useState("");
  const [visibility, setVisibility] = useState<LessonVisibility>("private");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setSubjectId("");
    setDepartment("");
    setFileType("");
    setLinkUrl("");
    setVisibility("private");
    setSelectedFile(null);
    setIsDragOver(false);
    setErrors({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = t("upload.errors.titleRequired");
    if (!fileType) next.fileType = t("upload.errors.fileTypeRequired");
    if (fileType === "link") {
      if (!linkUrl.trim()) {
        next.linkUrl = t("upload.errors.urlRequired");
      } else if (!/^https?:\/\/.+\..+/.test(linkUrl)) {
        next.linkUrl = t("upload.errors.urlInvalid");
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      title,
      description: description || undefined,
      subjectId,
      department: department || undefined,
      fileType: fileType as LessonFileType,
      file: selectedFile ?? undefined,
      linkUrl: linkUrl || undefined,
      visibility,
    });
    reset();
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setSelectedFile(file);
    },
    [],
  );

  const isLinkType = fileType === "link";
  const canSubmit = !!title.trim() && !!fileType && !isSubmitting;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-b border-border px-6 pb-4 pt-6">
          <SheetTitle className="text-lg font-extrabold text-foreground">
            {t("upload.title")}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex flex-1 flex-col gap-5 px-6 py-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label
                htmlFor="lesson-title"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                {t("upload.titleField")}
                <span className="ml-0.5 text-edu-error" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="lesson-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("upload.titlePlaceholder")}
                aria-required="true"
                aria-invalid={!!errors.title}
                aria-describedby={
                  errors.title ? "lesson-title-error" : undefined
                }
              />
              {errors.title && (
                <p
                  id="lesson-title-error"
                  className="text-xs text-edu-error-text"
                  role="alert"
                >
                  {errors.title}
                </p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label
                htmlFor="lesson-subject"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                {t("upload.subject")}
              </Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="lesson-subject">
                  <SelectValue placeholder={t("upload.subjectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label
                htmlFor="lesson-dept"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                {t("upload.department")}
              </Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="lesson-dept">
                  <SelectValue
                    placeholder={t("upload.departmentPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File type */}
            <div className="space-y-1.5">
              <Label
                htmlFor="lesson-filetype"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                {t("upload.fileType")}
                <span className="ml-0.5 text-edu-error" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={fileType}
                onValueChange={(v) => {
                  setFileType(v as LessonFileType);
                  setSelectedFile(null);
                  setLinkUrl("");
                  setErrors((prev) => ({ ...prev, fileType: "", linkUrl: "" }));
                }}
              >
                <SelectTrigger
                  id="lesson-filetype"
                  aria-invalid={!!errors.fileType}
                >
                  <SelectValue placeholder={t("upload.fileTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {ft.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fileType && (
                <p className="text-xs text-edu-error-text" role="alert">
                  {errors.fileType}
                </p>
              )}
            </div>

            {/* Conditional: link URL or file drop zone */}
            {isLinkType ? (
              <div className="space-y-1.5">
                <Label
                  htmlFor="lesson-link"
                  className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
                >
                  {t("upload.linkUrl")}
                  <span className="ml-0.5 text-edu-error" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="lesson-link"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  aria-required="true"
                  aria-invalid={!!errors.linkUrl}
                  aria-describedby={
                    errors.linkUrl ? "lesson-link-error" : undefined
                  }
                />
                {errors.linkUrl && (
                  <p
                    id="lesson-link-error"
                    className="text-xs text-edu-error-text"
                    role="alert"
                  >
                    {errors.linkUrl}
                  </p>
                )}
              </div>
            ) : fileType ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("upload.file")}
                </Label>
                <button
                  type="button"
                  aria-label={t("upload.dropZoneAriaLabel")}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full",
                    "flex cursor-pointer flex-col items-center justify-center gap-2",
                    "rounded-[var(--edu-radius-card)] border-2 border-dashed p-8 text-center",
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/40 hover:bg-muted/60",
                  )}
                >
                  <Upload
                    className={cn(
                      "size-8",
                      isDragOver ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  {selectedFile ? (
                    <span className="text-sm font-medium text-foreground">
                      {selectedFile.name}
                    </span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground">
                        {t("upload.dropZoneTitle")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("upload.dropZoneHint")}
                      </span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={
                    fileType === "pdf"
                      ? ".pdf"
                      : fileType === "pptx"
                        ? ".pptx,.ppt"
                        : ".mp4,.mov"
                  }
                  onChange={handleFileChange}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            ) : null}

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="lesson-desc"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                {t("upload.description")}
              </Label>
              <Textarea
                id="lesson-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("upload.descriptionPlaceholder")}
                rows={3}
              />
            </div>

            {/* Visibility */}
            <div className="space-y-1.5">
              <Label
                htmlFor="lesson-visibility"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                {t("upload.visibility")}
              </Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as LessonVisibility)}
              >
                <SelectTrigger id="lesson-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`visibility.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="mr-1.5 size-4" aria-hidden="true" />
              {t("upload.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <Upload className="mr-1.5 size-4" aria-hidden="true" />
              {isSubmitting ? t("upload.submitting") : t("upload.submit")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
