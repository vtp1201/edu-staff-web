import type { LinkedAccount } from "../../domain/entities/linked-account.entity";
import type { LinkedAccountDto } from "../dtos/linked-account-response.dto";

export function toLinkedAccount(dto: LinkedAccountDto): LinkedAccount {
  return {
    provider: dto.provider,
    linked: dto.linked,
    email: dto.email,
  };
}

export function toLinkedAccounts(dtos: LinkedAccountDto[]): LinkedAccount[] {
  return dtos.map(toLinkedAccount);
}
