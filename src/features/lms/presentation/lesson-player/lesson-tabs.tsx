import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type LessonTab = "notes" | "qna";

export interface LessonTabsProps {
  activeTab: LessonTab;
  onTabChange: (tab: LessonTab) => void;
  labels: { notes: string; qna: string };
  notesContent: React.ReactNode;
  qnaContent: React.ReactNode;
}

/** Notes / Q&A underline tab strip (ui/Tabs variant="line"). */
export function LessonTabs({
  activeTab,
  onTabChange,
  labels,
  notesContent,
  qnaContent,
}: LessonTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as LessonTab)}>
      <TabsList
        variant="line"
        className="w-full justify-start border-border border-b"
      >
        <TabsTrigger value="notes">{labels.notes}</TabsTrigger>
        <TabsTrigger value="qna">{labels.qna}</TabsTrigger>
      </TabsList>
      <TabsContent value="notes" className="pt-4">
        {notesContent}
      </TabsContent>
      <TabsContent value="qna" className="pt-4">
        {qnaContent}
      </TabsContent>
    </Tabs>
  );
}
