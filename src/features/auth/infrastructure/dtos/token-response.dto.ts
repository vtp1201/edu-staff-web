/** IAM `TokenResponse` — `POST /auth/signin` | `/auth/refresh` | `/auth/social`. */
export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  sessionId: string;
}
