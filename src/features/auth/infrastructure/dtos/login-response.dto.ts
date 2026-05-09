export interface LoginResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    roles: Array<{
      role: string;
      tenantId: string;
      tenantName: string;
    }>;
  };
}
