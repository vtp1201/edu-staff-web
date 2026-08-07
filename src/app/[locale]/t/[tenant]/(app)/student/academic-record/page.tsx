import { AcademicRecordContainer } from "@/features/academic-records/presentation/academic-record-screen/academic-record-container";
import {
  buildAcademicRecordVM,
  SELF_MEMBER_ID,
} from "@/features/academic-records/presentation/academic-record-screen/build-academic-record-vm";

type SearchParams = Promise<{ year?: string }>;

export default async function StudentAcademicRecordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { year } = await searchParams;
  const vm = await buildAcademicRecordVM({
    role: "student",
    // Resolved server-side from the access-token `sub` claim (never the wire).
    studentId: SELF_MEMBER_ID,
    year,
  });
  return <AcademicRecordContainer vm={vm} />;
}
