import { AppHeader } from "@/components/AppHeader";
import { FamilyMemberMedicationRedirect } from "@/components/FamilyMemberMedicationRedirect";
import { MedicationConfirmation } from "@/components/MedicationConfirmation";
import { MedicationErrorBoundary } from "@/components/MedicationErrorBoundary";

export default function MedicationPage() {
  return (
    <FamilyMemberMedicationRedirect>
      <div className="flex flex-col">
        <AppHeader showBack titleKey="medications" />
        <MedicationErrorBoundary>
          <MedicationConfirmation />
        </MedicationErrorBoundary>
      </div>
    </FamilyMemberMedicationRedirect>
  );
}
