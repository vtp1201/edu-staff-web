export interface LinkedAccountDto {
  provider: "google" | "vneId";
  linked: boolean;
  email?: string;
}
