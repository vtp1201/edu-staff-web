import { AcademicRecordContainer } from "@/features/academic-records/presentation/academic-record-screen/academic-record-container";
import { buildAcademicRecordVM } from "@/features/academic-records/presentation/academic-record-screen/build-academic-record-vm";

type Params = Promise<{ studentId: string }>;
type SearchParams = Promise<{ year?: string }>;

export default async function ParentAcademicRecordPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { studentId } = await params;
  const { year } = await searchParams;
  const vm = await buildAcademicRecordVM({ role: "parent", studentId, year });
  return <AcademicRecordContainer vm={vm} />;
}
