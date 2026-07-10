import { AppHeader } from "@/components/AppHeader";
import { MedicationConfirmation } from "@/components/MedicationConfirmation";
import { MedicationErrorBoundary } from "@/components/MedicationErrorBoundary";

export default function MedicationPage() {
  return (
    <div className="flex flex-col">
      <AppHeader showBack title="Medikamente" />
      <MedicationErrorBoundary>
        <MedicationConfirmation />
      </MedicationErrorBoundary>
    </div>
  );
}
