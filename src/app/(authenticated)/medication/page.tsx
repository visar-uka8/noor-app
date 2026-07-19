import { AppHeader } from "@/components/AppHeader";
import { FamilyMemberMedicationRedirect } from "@/components/FamilyMemberMedicationRedirect";
import { MedicationConfirmation } from "@/components/MedicationConfirmation";
import { MedicationErrorBoundary } from "@/components/MedicationErrorBoundary";

export default function MedicationPage() {
  return (
    <FamilyMemberMedicationRedirect>
      <div className="flex flex-col">
        <AppHeader showBack title="Medikamente" />
        <MedicationErrorBoundary>
          <MedicationConfirmation />
        </MedicationErrorBoundary>
      </div>
    </FamilyMemberMedicationRedirect>
  );
}
