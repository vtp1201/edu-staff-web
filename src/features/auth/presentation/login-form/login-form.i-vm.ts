import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

/** Presentation receives a stable error KEY and translates it (decision `0020`). */
export interface LoginFormVM {
  isLoading: boolean;
  errorKey: AuthFailure["type"] | null;
  onSubmit: (email: string, password: string) => void;
}
