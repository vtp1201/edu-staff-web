export type SocialProvider = "google" | "vneId";

export interface LinkedAccount {
  provider: SocialProvider;
  linked: boolean;
  /** Shown when linked. */
  email?: string;
}
