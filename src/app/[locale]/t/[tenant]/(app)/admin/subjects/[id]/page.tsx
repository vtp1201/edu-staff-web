import { makeSubjectCatalogueRepository } from "@/bootstrap/di/subject-catalogue.di";
import { SubjectDetailScreen } from "@/features/admin/subject-catalogue/presentation/subjects-screen/subject-detail-screen";
import { archiveSubjectAction, patchSubjectAction } from "../actions";

/**
 * Deep-linkable subject master editor (US-E12.13, gap NEW-02).
 *
 * Role gating is inherited from `(app)/admin/layout.tsx` — no guard here.
 * A missing subject (or one outside this tenant, which the tenant-scoped repo
 * reports the same way) renders an INLINE not-found instead of redirecting, so
 * the URL stays bookmarkable and nothing leaks about other tenants (AC-3).
 */
export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string; id: string }>;
}) {
  const { locale, tenant, id } = await params;
  const backHref = `/${locale}/t/${tenant}/admin/subjects`;

  const repo = await makeSubjectCatalogueRepository();
  const result = await repo.getSubject(id);

  if (!result.ok) {
    return (
      <SubjectDetailScreen
        subject={null}
        parentName=""
        classOfferings={[]}
        backHref={backHref}
        onSave={patchSubjectAction}
        onArchive={archiveSubjectAction}
      />
    );
  }

  const { subject, classOfferings } = result.value;

  // Breadcrumb department name (composition-layer cross-call, same style as
  // `admin/subjects/page.tsx`). A failed lookup must not break the editor.
  const parentsResult = await repo.listParents();
  const parentName = parentsResult.ok
    ? (parentsResult.value.find((p) => p.id === subject.parentId)?.name ?? "")
    : "";

  return (
    <SubjectDetailScreen
      subject={subject}
      parentName={parentName}
      classOfferings={classOfferings}
      backHref={backHref}
      onSave={patchSubjectAction}
      onArchive={archiveSubjectAction}
    />
  );
}
