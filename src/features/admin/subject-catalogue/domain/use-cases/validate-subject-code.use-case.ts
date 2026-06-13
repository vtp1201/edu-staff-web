import type { SubjectCatalogueFailure } from "../failures/subject-catalogue.failure";
import { fail, ok, type Result } from "./result";

const CODE_PATTERN = /^[A-Z0-9]{1,16}$/;

export function validateSubjectCode(
  code: string | null | undefined,
): Result<void, SubjectCatalogueFailure> {
  if (code == null || code === "") return ok(undefined);
  if (!CODE_PATTERN.test(code)) return fail({ type: "code-format" });
  return ok(undefined);
}
