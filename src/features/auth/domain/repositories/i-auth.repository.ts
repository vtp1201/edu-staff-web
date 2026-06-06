import type { AuthSession, AuthTokens } from "../entities/auth-user.entity";
import type { AuthFailure } from "../failures/auth.failure";

export type AuthResult =
  | { data: AuthSession; error?: never }
  | { data?: never; error: AuthFailure };

export type RefreshResult =
  | { data: AuthTokens; error?: never }
  | { data?: never; error: AuthFailure };

export interface IAuthRepository {
  /** `POST /auth/signin` then `GET /users/me` → full session. */
  signin(email: string, password: string): Promise<AuthResult>;
  /** `POST /auth/refresh` with refresh token → rotated token pair. */
  refresh(refreshToken: string): Promise<RefreshResult>;
  /** `POST /auth/signout` — server revokes session from bearer token. */
  signout(): Promise<void>;
}
