import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

/** Presentation receives a stable error KEY and translates it (decision `0020`). */
export interface LoginFormVM {
  isLoading: boolean;
  errorKey: AuthFailure["type"] | null;
  onSubmit: (email: string, password: string) => void;
  /** Trigger the Google OAuth popup; container exchanges the token server-side. */
  onGoogleSignin: () => void;
  isGoogleLoading: boolean;
  /** Undefined → VNeID is rendered disabled ("coming soon", ADR 0035). */
  onVneidSignin?: () => void;
}
