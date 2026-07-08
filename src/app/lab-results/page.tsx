import { AppHeader } from "@/components/AppHeader";
import { LabResultsFlow } from "@/components/LabResultsFlow";
import { LabResultsPageTitle } from "@/components/LabResultsPageTitle";

export default function LabResultsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LabResultsPageTitle />
      <LabResultsFlow />
    </div>
  );
}
