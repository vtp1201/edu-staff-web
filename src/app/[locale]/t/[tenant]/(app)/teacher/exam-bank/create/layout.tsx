/**
 * Full-screen builder layout (US-E11.3). Renders children in a plain full-height
 * wrapper so the exam builder owns the whole viewport. Note: this layout is still
 * nested under the (app) AppShell — escaping the shell entirely would require a
 * route outside the (app) group (flag to fe-lead / ADR 0043).
 */
export default function ExamBuilderCreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex h-screen flex-col bg-background">{children}</div>;
}
