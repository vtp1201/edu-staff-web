/**
 * Full-screen builder layout (edit mode, US-E11.3). See create/layout.tsx note
 * about AppShell nesting (flag to fe-lead / ADR 0043).
 */
export default function ExamBuilderEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex h-screen flex-col bg-background">{children}</div>;
}
