"use client";

import { Check, LogOut, Monitor, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  LinkedAccount,
  SocialProvider,
} from "@/features/user/domain/entities/linked-account.entity";
import type { LinkedAccountResult } from "@/features/user/domain/repositories/i-linked-accounts.repository";
import {
  checkRules,
  type StrengthLevel,
  strengthLevel,
  strengthScore,
} from "@/shared/password-strength";
import { cn } from "@/shared/utils";
import { AccountRequestsCard } from "./account-requests-card";
import { LinkedAccountsSection } from "./linked-accounts-section";
import type { ProfileScreenVM } from "./profile-screen.i-vm";

export interface ProfileScreenProps extends ProfileScreenVM {
  onLinkAccount: (provider: SocialProvider) => Promise<LinkedAccountResult>;
  onUnlinkAccount: (provider: SocialProvider) => Promise<LinkedAccountResult>;
  onFetchLinkedAccounts?: () => Promise<LinkedAccount[]>;
}

const LEVEL_COLOR: Record<Exclude<StrengthLevel, "empty">, string> = {
  weak: "bg-edu-error",
  fair: "bg-edu-warning",
  strong: "bg-edu-success",
};

export function ProfileScreen({
  fullName,
  email,
  phone,
  role,
  sessions,
  linkedAccounts,
  onLinkAccount,
  onUnlinkAccount,
  onFetchLinkedAccounts,
}: ProfileScreenProps) {
  const t = useTranslations("profile");
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Identity column */}
      <div className="flex h-fit flex-col gap-6">
        <Card className="overflow-hidden p-0">
          <div
            className="h-18"
            style={{
              background:
                "linear-gradient(120deg, var(--edu-primary), color-mix(in srgb, var(--edu-primary) 70%, var(--edu-success)))",
            }}
          />
          <CardContent className="flex flex-col items-center px-5 pb-5 text-center">
            <Avatar className="-mt-8 size-18 border-4 border-card">
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="mt-3 font-bold text-foreground">{fullName}</div>
            <StatusBadge tone="primary" className="mt-1">
              {role}
            </StatusBadge>
            <div className="mt-2 text-xs text-muted-foreground">{email}</div>
          </CardContent>
        </Card>

        <AccountRequestsCard />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">{t("tabs.personal")}</TabsTrigger>
          <TabsTrigger value="security">{t("tabs.security")}</TabsTrigger>
          <TabsTrigger value="sessions">{t("tabs.sessions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label={t("personal.fullName")} defaultValue={fullName} />
              <Field
                label={t("personal.email")}
                defaultValue={email}
                type="email"
              />
              <Field label={t("personal.phone")} defaultValue={phone} />
              <Field label={t("personal.role")} defaultValue={role} disabled />
              <div className="sm:col-span-2">
                <Button>{t("personal.save")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityTab />
          <LinkedAccountsSection
            initialData={linkedAccounts}
            onFetch={onFetchLinkedAccounts}
            onLink={onLinkAccount}
            onUnlink={onUnlinkAccount}
          />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab sessions={sessions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  // useId() links <Label htmlFor> to <Input id> — WCAG 1.3.1 / 4.1.2 (A11Y-003).
  const autoId = useId();
  const id = (props as { id?: string }).id ?? autoId;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}

function SecurityTab() {
  const t = useTranslations("profile.security");
  const [pw, setPw] = useState("");
  const level = strengthLevel(pw);
  const score = strengthScore(pw);
  const rules = checkRules(pw);
  const ruleList: { key: keyof typeof rules; label: string }[] = [
    { key: "length", label: t("rules.length") },
    { key: "upper", label: t("rules.upper") },
    { key: "number", label: t("rules.number") },
    { key: "special", label: t("rules.special") },
  ];
  // useId() links <Label htmlFor> to <Input id> for the new-password field —
  // cannot use <Field> here because the strength meter lives between label+input.
  // WCAG 1.3.1 / 4.1.2 (A11Y-003). Decision 0027.
  const newPwId = useId();

  return (
    <Card>
      <CardContent className="max-w-md space-y-4 p-6">
        <h2 className="font-bold text-foreground">{t("title")}</h2>
        <Field label={t("current")} type="password" />
        <div className="space-y-1.5">
          <Label htmlFor={newPwId}>{t("new")}</Label>
          <Input
            id={newPwId}
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {/* strength meter */}
          <div className="flex gap-1.5 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  level !== "empty" && i < score
                    ? LEVEL_COLOR[level]
                    : "bg-border",
                )}
              />
            ))}
          </div>
          {level !== "empty" && (
            <p className="text-xs font-medium text-muted-foreground">
              {t(`strength.${level}`)}
            </p>
          )}
        </div>
        <ul className="space-y-1">
          {ruleList.map((r) => (
            <li
              key={r.key}
              className={cn(
                "flex items-center gap-2 text-xs",
                rules[r.key] ? "text-edu-success" : "text-muted-foreground",
              )}
            >
              {rules[r.key] ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <X className="size-3.5" aria-hidden="true" />
              )}
              {r.label}
            </li>
          ))}
        </ul>
        <Field label={t("confirm")} type="password" />
        <Button>{t("update")}</Button>
      </CardContent>
    </Card>
  );
}

function SessionsTab({ sessions }: { sessions: ProfileScreenVM["sessions"] }) {
  const t = useTranslations("profile.sessions");
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-6 py-3">
              <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
                <Monitor className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {s.device}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("lastActive")}: {s.lastActive}
                </div>
              </div>
              {s.current ? (
                <StatusBadge tone="success">{t("thisDevice")}</StatusBadge>
              ) : (
                <Button variant="ghost" size="sm" className="text-edu-error">
                  <LogOut className="mr-1 size-3.5" />
                  {t("logout")}
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-4">
          <Button variant="outline" size="sm" className="text-edu-error">
            {t("logoutAll")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
