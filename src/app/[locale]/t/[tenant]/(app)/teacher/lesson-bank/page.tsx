import { makeListLessonsUseCase } from "@/bootstrap/di/lesson-bank.di";
import type { LessonEntity } from "@/features/lesson-bank/domain/entities/lesson.entity";
import { LessonBankScreen } from "@/features/lesson-bank/presentation/lesson-bank-screen/lesson-bank-screen";
import type { SubjectOption } from "@/features/lesson-bank/presentation/lesson-bank-screen/lesson-bank-screen.i-vm";
import { deleteLessonAction, uploadLessonAction } from "./actions";

// Mock-first: lms service not shipped (decision 0014). Current teacher is mocked
// so ownership-gated edit/delete is exercisable against the seeded fixtures.
const MOCK_CURRENT_USER_ID = "u-teacher-1";

function deriveSubjects(lessons: LessonEntity[]): SubjectOption[] {
  const map = new Map<string, string>();
  for (const l of lessons) map.set(l.subjectId, l.subjectName);
  return Array.from(map, ([id, name]) => ({ id, name }));
}

function deriveDepartments(lessons: LessonEntity[]): string[] {
  const set = new Set<string>();
  for (const l of lessons) if (l.department) set.add(l.department);
  return Array.from(set);
}

export default async function TeacherLessonBankPage() {
  let lessons: LessonEntity[] = [];
  try {
    lessons = await (await makeListLessonsUseCase()).execute();
  } catch {
    lessons = [];
  }

  return (
    <LessonBankScreen
      lessons={lessons}
      filters={{}}
      subjects={deriveSubjects(lessons)}
      departments={deriveDepartments(lessons)}
      viewerRole="teacher"
      currentUserId={MOCK_CURRENT_USER_ID}
      uploadAction={uploadLessonAction}
      deleteAction={deleteLessonAction}
    />
  );
}
