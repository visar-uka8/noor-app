import { AppHeader } from "@/components/AppHeader";
import { LabResultsFlow } from "@/components/LabResultsFlow";

export default function LabResultsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader showBack title="Laborwerte" />
      <LabResultsFlow />
    </div>
  );
}
