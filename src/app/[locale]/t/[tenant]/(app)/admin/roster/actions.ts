"use server";
import { makeRosterRepository } from "@/bootstrap/di/admin-roster.di";

export async function enrollAction(classId: string, studentId: string) {
  const repo = await makeRosterRepository();
  const result = await repo.enrollStudent(classId, studentId);
  if (!result.ok) return { ok: false as const, errorKey: result.error.type };
  return { ok: true as const };
}

export async function unenrollAction(classId: string, studentId: string) {
  const repo = await makeRosterRepository();
  const result = await repo.unenrollStudent(classId, studentId);
  if (!result.ok) return { ok: false as const, errorKey: result.error.type };
  return { ok: true as const };
}

export async function unenrollManyAction(
  classId: string,
  studentIds: string[],
) {
  const repo = await makeRosterRepository();
  const result = await repo.unenrollStudents(classId, studentIds);
  if (!result.ok) return { ok: false as const, errorKey: result.error.type };
  return { ok: true as const };
}

export async function transferAction(
  studentId: string,
  fromClassId: string,
  toClassId: string,
) {
  const repo = await makeRosterRepository();
  const result = await repo.transferStudent(studentId, fromClassId, toClassId);
  if (!result.ok) return { ok: false as const, errorKey: result.error.type };
  return { ok: true as const };
}
