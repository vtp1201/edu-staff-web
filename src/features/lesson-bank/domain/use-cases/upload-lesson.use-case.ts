import type { LessonEntity } from "../entities/lesson.entity";
import type { UploadLessonInput } from "../entities/upload-lesson-input.entity";
import type { LessonBankFailure } from "../failures/lesson-bank.failure";
import type { ILessonBankRepository } from "../repositories/i-lesson-bank.repository";

const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB

const SUPPORTED_TYPES = ["pdf", "pptx", "mp4", "link"] as const;

const URL_RE =
  /^https?:\/\/([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#\-_]*[\w@?^=%&/~+#\-_])?$/i;

export class UploadLessonUseCase {
  constructor(private readonly repo: ILessonBankRepository) {}

  async execute(
    input: UploadLessonInput,
  ): Promise<
    | { ok: true; lesson: LessonEntity }
    | { ok: false; failure: LessonBankFailure }
  > {
    if (!input.title?.trim()) {
      return { ok: false, failure: { type: "missing-title" } };
    }

    if (
      !SUPPORTED_TYPES.includes(
        input.fileType as (typeof SUPPORTED_TYPES)[number],
      )
    ) {
      return { ok: false, failure: { type: "unsupported-type" } };
    }

    if (input.fileType === "link") {
      if (!input.linkUrl || !URL_RE.test(input.linkUrl)) {
        return { ok: false, failure: { type: "invalid-url" } };
      }
    } else if (input.file && input.file.size > FILE_SIZE_LIMIT) {
      return { ok: false, failure: { type: "file-too-large" } };
    }

    try {
      const lesson = await this.repo.uploadLesson(input);
      return { ok: true, lesson };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      return { ok: false, failure: { type: "unknown", message: msg } };
    }
  }
}
