import { AcademicRecordContainer } from "@/features/academic-records/presentation/academic-record-screen/academic-record-container";
import { buildAcademicRecordVM } from "@/features/academic-records/presentation/academic-record-screen/build-academic-record-vm";

type SearchParams = Promise<{ year?: string }>;

export default async function StudentAcademicRecordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { year } = await searchParams;
  const vm = await buildAcademicRecordVM({
    role: "student",
    studentId: "me",
    year,
  });
  return <AcademicRecordContainer vm={vm} />;
}
