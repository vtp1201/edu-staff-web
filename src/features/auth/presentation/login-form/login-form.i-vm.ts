export interface LoginFormVM {
  isLoading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => void;
}
