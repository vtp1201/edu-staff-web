import "server-only";
import type { AxiosInstance } from "axios";
import { AUTH_EP } from "@/bootstrap/endpoint/auth.endpoint";
import type {
  AuthResult,
  IAuthRepository,
} from "../../domain/repositories/i-auth.repository";
import type { LoginResponseDto } from "../dtos/login-response.dto";
import { mapToSession } from "../mappers/auth.mapper";

export class AuthRepository implements IAuthRepository {
  constructor(private readonly http: AxiosInstance) {}

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const dto = (await this.http.post(AUTH_EP.login, {
        email,
        password,
      })) as unknown as LoginResponseDto;
      return { data: mapToSession(dto) };
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } }).response
        ?.status;
      if (status === 401) return { error: { type: "invalid-credentials" } };
      if (status === 403) return { error: { type: "account-suspended" } };
      if (!status) return { error: { type: "network-error" } };
      return { error: { type: "unknown", message: String(err) } };
    }
  }

  async logout(): Promise<void> {
    await this.http.post(AUTH_EP.logout);
  }
}
