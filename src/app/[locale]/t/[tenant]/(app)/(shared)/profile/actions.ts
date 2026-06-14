"use server";

import { makeLinkedAccountsUseCases } from "@/bootstrap/di/user.di";
import type { SocialProvider } from "@/features/user/domain/entities/linked-account.entity";

export async function getLinkedAccountsAction() {
  const { get } = makeLinkedAccountsUseCases();
  return get.execute();
}

export async function linkAccountAction(provider: SocialProvider) {
  const { link } = makeLinkedAccountsUseCases();
  return link.execute(provider);
}

export async function unlinkAccountAction(provider: SocialProvider) {
  const { unlink } = makeLinkedAccountsUseCases();
  return unlink.execute(provider);
}
