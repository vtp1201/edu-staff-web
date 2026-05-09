import type { AuthSession } from "../entities/auth-user.entity";
import type { AuthFailure } from "../failures/auth.failure";

export type AuthResult =
  | { data: AuthSession; error?: never }
  | { data?: never; error: AuthFailure };

export interface IAuthRepository {
  login(email: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
}
