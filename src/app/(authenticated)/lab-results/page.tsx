import { AppHeader } from "@/components/AppHeader";
import { LabResultsFlow } from "@/components/LabResultsFlow";
import { LabResultsPageTitle } from "@/components/LabResultsPageTitle";

export default function LabResultsPage() {
  return (
    <div className="flex flex-col">
      <LabResultsPageTitle />
      <LabResultsFlow />
    </div>
  );
}
