export interface ProfileSession {
  id: string;
  device: string;
  lastActive: string;
  current: boolean;
}

export interface ProfileScreenVM {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  sessions: ProfileSession[];
}
